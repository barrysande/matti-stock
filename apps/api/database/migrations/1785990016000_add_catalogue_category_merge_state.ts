import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('catalogue_categories', (table) => {
      table
        .uuid('merged_into_category_id')
        .nullable()
        .references('id')
        .inTable('catalogue_categories')
        .onDelete('RESTRICT')

      table.index(['merged_into_category_id'], 'catalogue_categories_merge_target_index')
    })

    this.schema.alterTable('catalogue_category_versions', (table) => {
      table
        .uuid('merged_into_category_id')
        .nullable()
        .references('id')
        .inTable('catalogue_categories')
        .onDelete('RESTRICT')

      table.index(['merged_into_category_id'], 'catalogue_category_versions_merge_target_index')
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        DROP INDEX catalogue_categories_active_top_level_name_unique;
        DROP INDEX catalogue_categories_active_sibling_name_unique
      `)

      await db.rawQuery(`
        ALTER TABLE catalogue_categories
          ADD CONSTRAINT catalogue_categories_merge_state_valid
            CHECK (
              merged_into_category_id IS NULL
              OR (archived_at IS NOT NULL AND merged_into_category_id <> id)
            )
      `)

      await db.rawQuery('DROP FUNCTION IF EXISTS prevent_catalogue_category_merge_reversal()')

      await db.rawQuery(`
        CREATE FUNCTION prevent_catalogue_category_merge_reversal()
        RETURNS trigger AS $$
        BEGIN
          IF OLD.merged_into_category_id IS NOT NULL AND (
            NEW.merged_into_category_id IS DISTINCT FROM OLD.merged_into_category_id
            OR NEW.archived_at IS NULL
          ) THEN
            RAISE EXCEPTION 'A merged catalogue category cannot be restored or redirected.'
              USING ERRCODE = '23514',
                    CONSTRAINT = 'catalogue_categories_merge_terminal';
          END IF;

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `)

      await db.rawQuery(`
        CREATE TRIGGER catalogue_categories_merge_terminal
          BEFORE UPDATE ON catalogue_categories
          FOR EACH ROW
          EXECUTE FUNCTION prevent_catalogue_category_merge_reversal()
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX catalogue_categories_available_top_name_unique
          ON catalogue_categories (lower(name))
          WHERE parent_id IS NULL
            AND (archived_at IS NULL OR merged_into_category_id IS NOT NULL)
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX catalogue_categories_available_sibling_name_unique
          ON catalogue_categories (parent_id, lower(name))
          WHERE parent_id IS NOT NULL
            AND (archived_at IS NULL OR merged_into_category_id IS NOT NULL)
      `)

      await db.rawQuery(`
        ALTER TABLE catalogue_category_versions
          DROP CONSTRAINT catalogue_category_versions_kind_valid,
          ADD CONSTRAINT catalogue_category_versions_kind_valid
            CHECK (change_kind IN ('CREATED', 'DETAILS_UPDATED', 'REPARENTED', 'MERGED', 'ARCHIVED', 'RESTORED')),
          ADD CONSTRAINT catalogue_category_versions_merge_state_valid
            CHECK ((change_kind = 'MERGED') = (merged_into_category_id IS NOT NULL))
      `)

      await db.rawQuery(`
        ALTER TABLE catalogue_item_versions
          DROP CONSTRAINT catalogue_item_versions_kind_valid,
          ADD CONSTRAINT catalogue_item_versions_kind_valid
            CHECK (change_kind IN ('CREATED', 'DETAILS_UPDATED', 'CLASSIFICATION_UPDATED', 'CATEGORY_MERGED', 'ARCHIVED', 'RESTORED'))
      `)
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE catalogue_item_versions
          DROP CONSTRAINT catalogue_item_versions_kind_valid,
          ADD CONSTRAINT catalogue_item_versions_kind_valid
            CHECK (change_kind IN ('CREATED', 'DETAILS_UPDATED', 'CLASSIFICATION_UPDATED', 'ARCHIVED', 'RESTORED'))
      `)

      await db.rawQuery(`
        ALTER TABLE catalogue_category_versions
          DROP CONSTRAINT catalogue_category_versions_merge_state_valid,
          DROP CONSTRAINT catalogue_category_versions_kind_valid,
          ADD CONSTRAINT catalogue_category_versions_kind_valid
            CHECK (change_kind IN ('CREATED', 'DETAILS_UPDATED', 'REPARENTED', 'ARCHIVED', 'RESTORED'))
      `)

      await db.rawQuery(`
        DROP INDEX catalogue_categories_available_top_name_unique;
        DROP INDEX catalogue_categories_available_sibling_name_unique
      `)

      await db.rawQuery(`
        ALTER TABLE catalogue_categories
          DROP CONSTRAINT catalogue_categories_merge_state_valid
      `)

      await db.rawQuery(`
        DROP TRIGGER catalogue_categories_merge_terminal ON catalogue_categories;
        DROP FUNCTION IF EXISTS prevent_catalogue_category_merge_reversal()
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX catalogue_categories_active_top_level_name_unique
          ON catalogue_categories (lower(name))
          WHERE archived_at IS NULL AND parent_id IS NULL
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX catalogue_categories_active_sibling_name_unique
          ON catalogue_categories (parent_id, lower(name))
          WHERE archived_at IS NULL AND parent_id IS NOT NULL
      `)
    })

    this.schema.alterTable('catalogue_category_versions', (table) => {
      table.dropIndex(['merged_into_category_id'], 'catalogue_category_versions_merge_target_index')
      table.dropColumn('merged_into_category_id')
    })

    this.schema.alterTable('catalogue_categories', (table) => {
      table.dropIndex(['merged_into_category_id'], 'catalogue_categories_merge_target_index')
      table.dropColumn('merged_into_category_id')
    })
  }
}
