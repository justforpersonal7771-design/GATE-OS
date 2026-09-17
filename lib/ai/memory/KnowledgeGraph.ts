export interface ConceptNode {
  topic: string;
  subject: string;
  prerequisites: string[];
  description: string;
}

export class KnowledgeGraph {
  private static nodes: Record<string, ConceptNode> = {
    // Math & Aptitude
    "Set Theory": {
      topic: "Set Theory",
      subject: "Discrete Mathematics",
      prerequisites: [],
      description: "Basic operations, sets, subsets, cardinalities, power sets."
    },
    "Relations": {
      topic: "Relations",
      subject: "Discrete Mathematics",
      prerequisites: ["Set Theory"],
      description: "Equivalence relations, partial orders, lattices, properties of relations."
    },
    "Functions": {
      topic: "Functions",
      subject: "Discrete Mathematics",
      prerequisites: ["Relations"],
      description: "One-to-one, onto functions, compositions, math mappings."
    },
    "Graph Theory": {
      topic: "Graph Theory",
      subject: "Discrete Mathematics",
      prerequisites: ["Relations", "Functions"],
      description: "Graphs, trees, connectivity, coloring, Euler and Hamiltonian paths."
    },
    
    // Core CS - Algorithms & Data Structures
    "Recursion": {
      topic: "Recursion",
      subject: "Algorithms",
      prerequisites: [],
      description: "Recursive algorithms, base cases, call stacks, basic divide & conquer."
    },
    "Asymptotic Analysis (O, Omega, Theta Complexities)": {
      topic: "Asymptotic Analysis (O, Omega, Theta Complexities)",
      subject: "Algorithms",
      prerequisites: ["Recursion"],
      description: "Big-O, Omega, Theta notations, Master Theorem, recurrences."
    },
    "Divide and Conquer": {
      topic: "Divide and Conquer",
      subject: "Algorithms",
      prerequisites: ["Asymptotic Analysis (O, Omega, Theta Complexities)"],
      description: "Merge Sort, Quick Sort, binary search recurrences."
    },
    "Dynamic Programming": {
      topic: "Dynamic Programming",
      subject: "Algorithms",
      prerequisites: ["Recursion", "Divide and Conquer"],
      description: "Memoization, tabulation, optimal substructure, overlapping subproblems."
    },
    "Greedy Algorithms": {
      topic: "Greedy Algorithms",
      subject: "Algorithms",
      prerequisites: ["Dynamic Programming"],
      description: "Greedy choice property, fractional knapsack, Huffman codes, MST algorithms."
    },
    "Graph Algorithms (BFS, DFS, Shortest Paths)": {
      topic: "Graph Algorithms (BFS, DFS, Shortest Paths)",
      subject: "Algorithms",
      prerequisites: ["Graph Theory"],
      description: "Breadth-first search, depth-first search, Dijkstra, Bellman-Ford, Kruskal, Prim."
    },
    
    // Data Structures
    "Arrays and Linked Lists": {
      topic: "Arrays and Linked Lists",
      subject: "Data Structures",
      prerequisites: [],
      description: "Linear data structures, memory allocation, list operations."
    },
    "Stacks and Queues": {
      topic: "Stacks and Queues",
      subject: "Data Structures",
      prerequisites: ["Arrays and Linked Lists"],
      description: "LIFO/FIFO concepts, dynamic queue sizes, circular buffers."
    },
    "Trees": {
      topic: "Trees",
      subject: "Data Structures",
      prerequisites: ["Arrays and Linked Lists"],
      description: "N-ary trees, tree traversals (pre, in, post order), properties."
    },
    "Binary Search Trees": {
      topic: "Binary Search Trees",
      subject: "Data Structures",
      prerequisites: ["Trees"],
      description: "Binary search property, insertions, deletions, search operations."
    },
    "AVL Trees & Red-Black Trees": {
      topic: "AVL Trees & Red-Black Trees",
      subject: "Data Structures",
      prerequisites: ["Binary Search Trees"],
      description: "Balanced BSTs, tree rotations, color balancing constraints."
    },
    "Heaps": {
      topic: "Heaps",
      subject: "Data Structures",
      prerequisites: ["Trees"],
      description: "Binary heaps, min/max heap properties, priority queues."
    },
    "Hashing": {
      topic: "Hashing",
      subject: "Data Structures",
      prerequisites: ["Arrays and Linked Lists"],
      description: "Hash functions, collision resolution, chaining, open addressing."
    }
  };

  /**
   * Return all nodes mapped in the graph.
   */
  public static getAllNodes(): ConceptNode[] {
    return Object.values(this.nodes);
  }

  /**
   * Find node by topic.
   */
  public static getNode(topic: string): ConceptNode | undefined {
    return this.nodes[topic];
  }

  /**
   * Analyze prerequisite weak links.
   * If a student is failing in a topic, check if their mastery of prerequisite topics is low (< 50%).
   */
  public static diagnosePrerequisiteWeaknesses(
    topic: string,
    topicMasteries: Record<string, number> // Maps topic name -> mastery percentage (0-100)
  ): { topic: string; mastery: number; description: string }[] {
    const node = this.getNode(topic);
    if (!node) return [];

    const weaknesses: { topic: string; mastery: number; description: string }[] = [];
    const queue = [...node.prerequisites];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const prereq = queue.shift()!;
      if (visited.has(prereq)) continue;
      visited.add(prereq);

      const prereqNode = this.getNode(prereq);
      const mastery = topicMasteries[prereq] !== undefined ? topicMasteries[prereq] : 100; // Default to 100 if no data
      
      if (mastery < 60) {
        weaknesses.push({
          topic: prereq,
          mastery,
          description: prereqNode?.description || "Basic concepts."
        });
      }

      if (prereqNode) {
        queue.push(...prereqNode.prerequisites);
      }
    }

    return weaknesses;
  }
}
