import { test } from '@japa/runner'
import PersonParticipationConflictException from '#exceptions/person_participation_conflict_exception'
import PersonSeparationService from '#services/person_separation_service'

test.group('Services person separation', () => {
  test('allows independently participating people', ({ assert }) => {
    const separation = new PersonSeparationService()

    assert.doesNotThrow(() =>
      separation.assertDifferentPeople(
        { personId: 'person-proposer' },
        { personId: 'person-approver' }
      )
    )
  })

  test('rejects the same person through different account references', ({ assert }) => {
    const separation = new PersonSeparationService()
    const proposer = {
      accountId: 'account-primary',
      personId: 'person-shared',
    }
    const approver = {
      accountId: 'account-secondary',
      personId: 'person-shared',
    }

    assert.throws(
      () => separation.assertDifferentPeople(proposer, approver),
      PersonParticipationConflictException
    )
  })

  test('rejects another role held by the same person', ({ assert }) => {
    const separation = new PersonSeparationService()
    const proposer = {
      personId: 'person-shared',
      roleKey: 'STOCK_SUPERVISOR',
    }
    const approver = {
      personId: 'person-shared',
      roleKey: 'FINANCE_SUPERVISOR',
    }

    assert.throws(
      () => separation.assertDifferentPeople(proposer, approver),
      PersonParticipationConflictException
    )
  })

  test('rejects delegated authority held by the same person', ({ assert }) => {
    const separation = new PersonSeparationService()
    const proposer = {
      personId: 'person-shared',
      evidenceType: 'DIRECT',
    }
    const approver = {
      personId: 'person-shared',
      evidenceType: 'DELEGATED',
      delegationId: 'delegation-id',
    }

    assert.throws(
      () => separation.assertDifferentPeople(proposer, approver),
      PersonParticipationConflictException
    )
  })

  test('uses a stable safe domain conflict', ({ assert }) => {
    const separation = new PersonSeparationService()
    let captured: unknown

    try {
      separation.assertDifferentPeople({ personId: 'person-shared' }, { personId: 'person-shared' })
    } catch (error) {
      captured = error
    }

    assert.instanceOf(captured, PersonParticipationConflictException)
    assert.equal(PersonParticipationConflictException.status, 409)
    assert.equal(PersonParticipationConflictException.code, 'E_PERSON_PARTICIPATION_CONFLICT')
    assert.equal(
      (captured as Error).message,
      'Independent participation requires a different person.'
    )
  })
})
