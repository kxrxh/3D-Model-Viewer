/**
 * Builds a hierarchical tree structure from a flat object of parts
 * @param {Object} parts - Flat object of parts
 * @returns {Object} Hierarchical tree structure
 */
export function buildTree(parts) {
	const tree = {};
	Object.keys(parts).forEach((fullPath) => {
		const segments = fullPath.split(" / ");
		let currentLevel = tree;
		let path = "";
		segments.forEach((segment, index) => {
			path = index === 0 ? segment : path + " / " + segment;
			if (!currentLevel[segment]) {
				currentLevel[segment] = { name: segment, fullPath: path, children: {} };
			}
			currentLevel = currentLevel[segment].children;
		});
	});
	return tree;
}

/**
 * Gets all descendant paths for a given node
 * @param {Object} node - Tree node
 * @returns {Array} List of paths
 */
export function getAllDescendantPaths(node) {
	let paths = [node.fullPath];
	Object.values(node.children).forEach((child) => {
		paths = paths.concat(getAllDescendantPaths(child));
	});
	return paths;
}

/**
 * Filters tree based on search query
 * @param {Object} tree - Tree structure
 * @param {string} searchQuery - Query to filter by
 * @returns {Object} Filtered tree
 */
export function filterTree(tree, searchQuery) {
	if (!searchQuery) return tree;

	const searchLower = searchQuery.toLowerCase();
	const filteredTree = {};

	const filterNode = (node, parentKey) => {
		const nodeNameLower = node.name.toLowerCase();
		const matchesSearch = nodeNameLower.includes(searchLower);

		// Check if any children match the search
		const filteredChildren = {};
		let hasMatchingChildren = false;

		Object.entries(node.children).forEach(([key, child]) => {
			const childResult = filterNode(child, key);
			if (childResult) {
				filteredChildren[key] = childResult;
				hasMatchingChildren = true;
			}
		});

		// Include this node if it matches or has matching children
		if (matchesSearch || hasMatchingChildren) {
			return {
				...node,
				children: filteredChildren,
			};
		}

		return null;
	};

	Object.entries(tree).forEach(([key, node]) => {
		const filteredNode = filterNode(node, key);
		if (filteredNode) {
			filteredTree[key] = filteredNode;
		}
	});

	return filteredTree;
}
