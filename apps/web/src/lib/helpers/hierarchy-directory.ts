export interface HierarchyDirectoryItem {
	id: string;
	parentId: string | null;
}

export interface HierarchyDirectoryNode<T extends HierarchyDirectoryItem> {
	item: T;
	children: HierarchyDirectoryNode<T>[];
}

export interface VisibleHierarchyDirectoryNode<
	T extends HierarchyDirectoryItem
> extends HierarchyDirectoryNode<T> {
	depth: number;
}

export function buildHierarchyDirectory<T extends HierarchyDirectoryItem>(items: T[]) {
	const nodes = new Map<string, HierarchyDirectoryNode<T>>(
		items.map((item) => [item.id, { item, children: [] }])
	);
	const roots: HierarchyDirectoryNode<T>[] = [];

	for (const item of items) {
		const node = nodes.get(item.id);
		const parent = item.parentId ? nodes.get(item.parentId) : undefined;

		if (!node) {
			continue;
		}

		if (parent) {
			parent.children.push(node);
		} else {
			roots.push(node);
		}
	}

	return roots;
}

export function visibleHierarchyDirectory<T extends HierarchyDirectoryItem>(
	roots: HierarchyDirectoryNode<T>[],
	openIds: Set<string>
) {
	const visible: VisibleHierarchyDirectoryNode<T>[] = [];

	function append(nodes: HierarchyDirectoryNode<T>[], depth: number) {
		for (const node of nodes) {
			visible.push({ ...node, depth });

			if (node.children.length > 0 && openIds.has(node.item.id)) {
				append(node.children, depth + 1);
			}
		}
	}

	append(roots, 0);

	return visible;
}
