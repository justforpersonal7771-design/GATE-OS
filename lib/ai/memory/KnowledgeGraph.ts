export interface ConceptNode {
  topic: string;
  subject: string;
  prerequisites: string[];
  description: string;
}

// Topic keys below match the exact `topic` strings used in Aggregated_Output.json
// (see MasteryEngine.calculateTopicMastery) so prerequisite-weakness lookups connect
// to real, computed mastery data rather than a cosmetic/disconnected topic list.
export class KnowledgeGraph {
  private static nodes: Record<string, ConceptNode> = {
    // ---- Discrete Mathematics ----
    "Sets, Relations, Functions, Partial Orders, Lattices": {
      topic: "Sets, Relations, Functions, Partial Orders, Lattices",
      subject: "Discrete Mathematics",
      prerequisites: [],
      description: "Basic set operations, relations, functions, partial orders, and lattices."
    },
    "Propositional and First-Order Quantifier Logic": {
      topic: "Propositional and First-Order Quantifier Logic",
      subject: "Discrete Mathematics",
      prerequisites: [],
      description: "Propositional logic, quantifiers, inference rules, validity and satisfiability."
    },
    "Combinatorics (Counting Rules, Summation Formulas)": {
      topic: "Combinatorics (Counting Rules, Summation Formulas)",
      subject: "Discrete Mathematics",
      prerequisites: ["Sets, Relations, Functions, Partial Orders, Lattices"],
      description: "Permutations, combinations, pigeonhole principle, summation identities."
    },
    "Recurrence Relations and Generating Functions": {
      topic: "Recurrence Relations and Generating Functions",
      subject: "Discrete Mathematics",
      prerequisites: ["Combinatorics (Counting Rules, Summation Formulas)"],
      description: "Solving recurrences, generating functions, Master Theorem groundwork."
    },
    "Algebraic Structures (Monoids, Groups)": {
      topic: "Algebraic Structures (Monoids, Groups)",
      subject: "Discrete Mathematics",
      prerequisites: ["Sets, Relations, Functions, Partial Orders, Lattices"],
      description: "Monoids, groups, subgroups, homomorphisms."
    },
    "Graph Theory (Connectivity, Paths, Cycles, Trees)": {
      topic: "Graph Theory (Connectivity, Paths, Cycles, Trees)",
      subject: "Discrete Mathematics",
      prerequisites: ["Sets, Relations, Functions, Partial Orders, Lattices"],
      description: "Graphs, trees, connectivity, paths, cycles, Euler/Hamiltonian paths."
    },
    "Advanced Graph Bounds (Matching, Coloring Theorems)": {
      topic: "Advanced Graph Bounds (Matching, Coloring Theorems)",
      subject: "Discrete Mathematics",
      prerequisites: ["Graph Theory (Connectivity, Paths, Cycles, Trees)"],
      description: "Matching theorems, graph coloring, chromatic bounds."
    },

    // ---- Linear Algebra ----
    "Matrices, Determinants, & Linear Equation Systems": {
      topic: "Matrices, Determinants, & Linear Equation Systems",
      subject: "Linear Algebra",
      prerequisites: [],
      description: "Matrix operations, determinants, solving systems of linear equations."
    },
    "Eigenvalues and Eigenvectors": {
      topic: "Eigenvalues and Eigenvectors",
      subject: "Linear Algebra",
      prerequisites: ["Matrices, Determinants, & Linear Equation Systems"],
      description: "Characteristic polynomials, eigenvalues, eigenvectors, diagonalization."
    },
    "Matrix Factorization & LU Decomposition": {
      topic: "Matrix Factorization & LU Decomposition",
      subject: "Linear Algebra",
      prerequisites: ["Matrices, Determinants, & Linear Equation Systems"],
      description: "LU decomposition and other matrix factorization techniques."
    },

    // ---- Calculus ----
    "Limits, Continuity, and Differentiability": {
      topic: "Limits, Continuity, and Differentiability",
      subject: "Calculus",
      prerequisites: [],
      description: "Limits, continuity, differentiability of single-variable functions."
    },
    "Maxima and Minima Optimization Bounds": {
      topic: "Maxima and Minima Optimization Bounds",
      subject: "Calculus",
      prerequisites: ["Limits, Continuity, and Differentiability"],
      description: "Finding local/global extrema, optimization via derivatives."
    },
    "Mean Value Theorems & Definite Integration": {
      topic: "Mean Value Theorems & Definite Integration",
      subject: "Calculus",
      prerequisites: ["Limits, Continuity, and Differentiability"],
      description: "Rolle's/Lagrange's mean value theorems, definite integrals."
    },

    // ---- Probability & Statistics ----
    "Random Variables & Sampling Rules": {
      topic: "Random Variables & Sampling Rules",
      subject: "Probability & Statistics",
      prerequisites: [],
      description: "Random variables, expectation, variance, sampling."
    },
    "Conditional Probability & Bayes Theorem": {
      topic: "Conditional Probability & Bayes Theorem",
      subject: "Probability & Statistics",
      prerequisites: ["Random Variables & Sampling Rules"],
      description: "Conditional probability, independence, Bayes' theorem."
    },
    "Continuous/Discrete Distributions (Uniform, Normal, Exponential)": {
      topic: "Continuous/Discrete Distributions (Uniform, Normal, Exponential)",
      subject: "Probability & Statistics",
      prerequisites: ["Random Variables & Sampling Rules"],
      description: "Uniform, normal, and exponential distributions."
    },
    "Standard Distributions (Poisson, Binomial)": {
      topic: "Standard Distributions (Poisson, Binomial)",
      subject: "Probability & Statistics",
      prerequisites: ["Continuous/Discrete Distributions (Uniform, Normal, Exponential)"],
      description: "Poisson and binomial distributions and their properties."
    },

    // ---- Programming in C ----
    "Data Types, Syntax, Control Structures, Loops": {
      topic: "Data Types, Syntax, Control Structures, Loops",
      subject: "Programming in C",
      prerequisites: [],
      description: "C fundamentals: data types, control flow, iteration."
    },
    "Functions, Parameter Passing, Scope Rules, Recursion": {
      topic: "Functions, Parameter Passing, Scope Rules, Recursion",
      subject: "Programming in C",
      prerequisites: ["Data Types, Syntax, Control Structures, Loops"],
      description: "Functions, parameter passing conventions, scope, recursion."
    },
    "Pointers, Multi-Dimensional Arrays, Structures": {
      topic: "Pointers, Multi-Dimensional Arrays, Structures",
      subject: "Programming in C",
      prerequisites: ["Data Types, Syntax, Control Structures, Loops"],
      description: "Pointers, multi-dimensional arrays, structs, and their interplay."
    },
    "Dynamic Memory Allocation & File Handling": {
      topic: "Dynamic Memory Allocation & File Handling",
      subject: "Programming in C",
      prerequisites: ["Pointers, Multi-Dimensional Arrays, Structures"],
      description: "malloc/free, dynamic structures, file I/O."
    },

    // ---- Data Structures ----
    "Abstract Data Types (ADTs), Stacks, Queues": {
      topic: "Abstract Data Types (ADTs), Stacks, Queues",
      subject: "Data Structures",
      prerequisites: ["Pointers, Multi-Dimensional Arrays, Structures"],
      description: "ADT design, stack/queue operations, LIFO/FIFO semantics."
    },
    "Linked Lists & Binary Trees": {
      topic: "Linked Lists & Binary Trees",
      subject: "Data Structures",
      prerequisites: ["Abstract Data Types (ADTs), Stacks, Queues"],
      description: "Singly/doubly linked lists, binary tree structure and traversals."
    },
    "Binary Search Trees (BSTs) & Binary Heaps": {
      topic: "Binary Search Trees (BSTs) & Binary Heaps",
      subject: "Data Structures",
      prerequisites: ["Linked Lists & Binary Trees"],
      description: "BST invariants, insert/delete/search, binary heap operations."
    },
    "BSTs & Binary Heaps": {
      topic: "BSTs & Binary Heaps",
      subject: "Data Structures",
      prerequisites: ["Linked Lists & Binary Trees"],
      description: "BST invariants, insert/delete/search, binary heap operations."
    },

    // ---- Algorithms ----
    "Asymptotic Analysis (O, Omega, Theta Complexities)": {
      topic: "Asymptotic Analysis (O, Omega, Theta Complexities)",
      subject: "Algorithms",
      prerequisites: ["Functions, Parameter Passing, Scope Rules, Recursion"],
      description: "Big-O, Omega, Theta notations, Master Theorem, recurrences."
    },
    "Searching, Sorting, Hashing Mechanisms": {
      topic: "Searching, Sorting, Hashing Mechanisms",
      subject: "Algorithms",
      prerequisites: ["Asymptotic Analysis (O, Omega, Theta Complexities)"],
      description: "Search/sort algorithms, hash functions, collision resolution."
    },
    "Divide-and-Conquer Designs": {
      topic: "Divide-and-Conquer Designs",
      subject: "Algorithms",
      prerequisites: ["Asymptotic Analysis (O, Omega, Theta Complexities)"],
      description: "Merge sort, quick sort, and other divide-and-conquer recurrences."
    },
    "Greedy Approach & Divide-and-Conquer Designs": {
      topic: "Greedy Approach & Divide-and-Conquer Designs",
      subject: "Algorithms",
      prerequisites: ["Divide-and-Conquer Designs"],
      description: "Greedy choice property, exchange arguments, classic greedy problems."
    },
    "Dynamic Programming Infrastructure": {
      topic: "Dynamic Programming Infrastructure",
      subject: "Algorithms",
      prerequisites: ["Divide-and-Conquer Designs"],
      description: "Memoization, tabulation, optimal substructure, overlapping subproblems."
    },
    "Graph Traversals (BFS, DFS) & Single-Source Shortest Paths": {
      topic: "Graph Traversals (BFS, DFS) & Single-Source Shortest Paths",
      subject: "Algorithms",
      prerequisites: ["Graph Theory (Connectivity, Paths, Cycles, Trees)", "Abstract Data Types (ADTs), Stacks, Queues"],
      description: "BFS, DFS, Dijkstra, Bellman-Ford shortest-path algorithms."
    },
    "Minimum Spanning Trees (Prim/Kruskal Algorithms)": {
      topic: "Minimum Spanning Trees (Prim/Kruskal Algorithms)",
      subject: "Algorithms",
      prerequisites: ["Graph Traversals (BFS, DFS) & Single-Source Shortest Paths"],
      description: "Prim's and Kruskal's MST algorithms, cut property."
    },

    // ---- Digital Logic ----
    "Number Representations & Fixed/Floating Point Math": {
      topic: "Number Representations & Fixed/Floating Point Math",
      subject: "Digital Logic",
      prerequisites: [],
      description: "Number systems, fixed and floating-point representation, arithmetic."
    },
    "Boolean Algebra, Minimization, K-Maps": {
      topic: "Boolean Algebra, Minimization, K-Maps",
      subject: "Digital Logic",
      prerequisites: [],
      description: "Boolean algebra laws, minimization, Karnaugh maps."
    },
    "Combinational Logic (Multiplexers, Decoders, Adders)": {
      topic: "Combinational Logic (Multiplexers, Decoders, Adders)",
      subject: "Digital Logic",
      prerequisites: ["Boolean Algebra, Minimization, K-Maps"],
      description: "Multiplexers, decoders, adders, and other combinational circuits."
    },
    "Sequential Circuits (Flip-Flops, Registers, Counters)": {
      topic: "Sequential Circuits (Flip-Flops, Registers, Counters)",
      subject: "Digital Logic",
      prerequisites: ["Combinational Logic (Multiplexers, Decoders, Adders)"],
      description: "Flip-flops, registers, counters, state machines."
    },

    // ---- Computer Organization and Architecture (COA) ----
    "Machine Instructions & Addressing Modes": {
      topic: "Machine Instructions & Addressing Modes",
      subject: "Computer Organization and Architecture (COA)",
      prerequisites: ["Number Representations & Fixed/Floating Point Math"],
      description: "Instruction formats, addressing modes, instruction sets."
    },
    "ALU, Control Unit Design, Data-Path Operations": {
      topic: "ALU, Control Unit Design, Data-Path Operations",
      subject: "Computer Organization and Architecture (COA)",
      prerequisites: ["Boolean Algebra, Minimization, K-Maps", "Machine Instructions & Addressing Modes"],
      description: "ALU design, control unit, data-path organization."
    },
    "Instruction Pipelining, Performance, Hazard Management": {
      topic: "Instruction Pipelining, Performance, Hazard Management",
      subject: "Computer Organization and Architecture (COA)",
      prerequisites: ["ALU, Control Unit Design, Data-Path Operations"],
      description: "Pipelining stages, hazards, forwarding, performance metrics."
    },
    "Memory Hierarchy (Direct/Associative Cache Mapping)": {
      topic: "Memory Hierarchy (Direct/Associative Cache Mapping)",
      subject: "Computer Organization and Architecture (COA)",
      prerequisites: ["Sequential Circuits (Flip-Flops, Registers, Counters)"],
      description: "Cache mapping techniques, hit/miss rates, memory hierarchy."
    },
    "Main Memory & Virtual Memory Mechanics": {
      topic: "Main Memory & Virtual Memory Mechanics",
      subject: "Computer Organization and Architecture (COA)",
      prerequisites: ["Memory Hierarchy (Direct/Associative Cache Mapping)"],
      description: "Main memory organization, virtual memory mechanics."
    },
    "I/O Interfaces (Interrupts & DMA Control Modes)": {
      topic: "I/O Interfaces (Interrupts & DMA Control Modes)",
      subject: "Computer Organization and Architecture (COA)",
      prerequisites: ["ALU, Control Unit Design, Data-Path Operations"],
      description: "Interrupt-driven I/O, DMA control modes."
    },

    // ---- Theory of Computation (TOC) ----
    "Regular Expressions & Finite Automata (DFA/NFA Min)": {
      topic: "Regular Expressions & Finite Automata (DFA/NFA Min)",
      subject: "Theory of Computation (TOC)",
      prerequisites: ["Sets, Relations, Functions, Partial Orders, Lattices"],
      description: "Regular expressions, DFA/NFA construction and minimization."
    },
    "Regular and Context-Free Languages & Pumping Lemma": {
      topic: "Regular and Context-Free Languages & Pumping Lemma",
      subject: "Theory of Computation (TOC)",
      prerequisites: ["Regular Expressions & Finite Automata (DFA/NFA Min)"],
      description: "Regular/context-free language properties, pumping lemma proofs."
    },
    "Context-Free Grammars & Push-Down Automata": {
      topic: "Context-Free Grammars & Push-Down Automata",
      subject: "Theory of Computation (TOC)",
      prerequisites: ["Regular and Context-Free Languages & Pumping Lemma"],
      description: "CFGs, push-down automata, CFG-PDA equivalence."
    },
    "Turing Machines & Undecidability": {
      topic: "Turing Machines & Undecidability",
      subject: "Theory of Computation (TOC)",
      prerequisites: ["Context-Free Grammars & Push-Down Automata"],
      description: "Turing machines, decidability, undecidability, reducibility."
    },

    // ---- Compiler Design ----
    "Lexical Analysis & Parsing Architectures (LL(1), LR(1), LALR)": {
      topic: "Lexical Analysis & Parsing Architectures (LL(1), LR(1), LALR)",
      subject: "Compiler Design",
      prerequisites: ["Context-Free Grammars & Push-Down Automata", "Regular Expressions & Finite Automata (DFA/NFA Min)"],
      description: "Lexical analysis, LL(1)/LR(1)/LALR parsing techniques."
    },
    "Syntax-Directed Translation & Runtime Environments": {
      topic: "Syntax-Directed Translation & Runtime Environments",
      subject: "Compiler Design",
      prerequisites: ["Lexical Analysis & Parsing Architectures (LL(1), LR(1), LALR)"],
      description: "Syntax-directed translation schemes, activation records, runtime environments."
    },
    "Intermediate Code Generation & Local Code Optimization": {
      topic: "Intermediate Code Generation & Local Code Optimization",
      subject: "Compiler Design",
      prerequisites: ["Syntax-Directed Translation & Runtime Environments"],
      description: "Three-address code, local optimizations."
    },
    "Data Flow Analysis: Constant Propagation, Liveliness Analysis, Common Subexpression Elimination": {
      topic: "Data Flow Analysis: Constant Propagation, Liveliness Analysis, Common Subexpression Elimination",
      subject: "Compiler Design",
      prerequisites: ["Intermediate Code Generation & Local Code Optimization"],
      description: "Constant propagation, liveness analysis, common subexpression elimination."
    },

    // ---- Operating Systems (OS) ----
    "System Calls, Processes, Threads, InterProcess Communication": {
      topic: "System Calls, Processes, Threads, InterProcess Communication",
      subject: "Operating Systems (OS)",
      prerequisites: [],
      description: "System calls, process/thread models, inter-process communication."
    },
    "Concurrency & Synchronization (Semaphores, Mutex, Monitors, Locks)": {
      topic: "Concurrency & Synchronization (Semaphores, Mutex, Monitors, Locks)",
      subject: "Operating Systems (OS)",
      prerequisites: ["System Calls, Processes, Threads, InterProcess Communication"],
      description: "Semaphores, mutexes, monitors, classic synchronization problems."
    },
    "Deadlock Prevention, Avoidance, Detection, Recovery": {
      topic: "Deadlock Prevention, Avoidance, Detection, Recovery",
      subject: "Operating Systems (OS)",
      prerequisites: ["Concurrency & Synchronization (Semaphores, Mutex, Monitors, Locks)"],
      description: "Deadlock conditions, prevention, avoidance (Banker's algorithm), detection."
    },
    "CPU and I/O Scheduling": {
      topic: "CPU and I/O Scheduling",
      subject: "Operating Systems (OS)",
      prerequisites: ["System Calls, Processes, Threads, InterProcess Communication"],
      description: "CPU scheduling algorithms, I/O scheduling strategies."
    },
    "Memory Management and Virtual Memory": {
      topic: "Memory Management and Virtual Memory",
      subject: "Operating Systems (OS)",
      prerequisites: ["Main Memory & Virtual Memory Mechanics"],
      description: "Paging, segmentation, page replacement, OS-level virtual memory."
    },
    "File Systems Operations & Disk Scheduling Optimization": {
      topic: "File Systems Operations & Disk Scheduling Optimization",
      subject: "Operating Systems (OS)",
      prerequisites: ["Memory Management and Virtual Memory"],
      description: "File system operations, disk scheduling algorithms."
    },

    // ---- Database Management Systems (DBMS) ----
    "ER-Model": {
      topic: "ER-Model",
      subject: "Database Management Systems (DBMS)",
      prerequisites: [],
      description: "Entity-relationship modeling, entities, attributes, relationships."
    },
    "Relational Models, Relational Algebra, Tuple Calculus": {
      topic: "Relational Models, Relational Algebra, Tuple Calculus",
      subject: "Database Management Systems (DBMS)",
      prerequisites: ["ER-Model", "Sets, Relations, Functions, Partial Orders, Lattices"],
      description: "Relational model, relational algebra, tuple calculus."
    },
    "SQL Queries (DDL/DML, Joins, Aggregations)": {
      topic: "SQL Queries (DDL/DML, Joins, Aggregations)",
      subject: "Database Management Systems (DBMS)",
      prerequisites: ["Relational Models, Relational Algebra, Tuple Calculus"],
      description: "SQL DDL/DML, joins, aggregation queries."
    },
    "Integrity Constraints & Functional Dependencies": {
      topic: "Integrity Constraints & Functional Dependencies",
      subject: "Database Management Systems (DBMS)",
      prerequisites: ["Relational Models, Relational Algebra, Tuple Calculus"],
      description: "Keys, integrity constraints, functional dependencies."
    },
    "Normalization Schemes (1NF, 2NF, 3NF, BCNF Boundaries)": {
      topic: "Normalization Schemes (1NF, 2NF, 3NF, BCNF Boundaries)",
      subject: "Database Management Systems (DBMS)",
      prerequisites: ["Integrity Constraints & Functional Dependencies"],
      description: "Normal forms, decomposition, BCNF boundary cases."
    },
    "Transactions, Concurrency Control, Conflict Serializability": {
      topic: "Transactions, Concurrency Control, Conflict Serializability",
      subject: "Database Management Systems (DBMS)",
      prerequisites: ["Relational Models, Relational Algebra, Tuple Calculus", "Concurrency & Synchronization (Semaphores, Mutex, Monitors, Locks)"],
      description: "ACID transactions, concurrency control protocols, conflict serializability."
    },
    "File Organization & Indexing (e.g., B and B+ Trees)": {
      topic: "File Organization & Indexing (e.g., B and B+ Trees)",
      subject: "Database Management Systems (DBMS)",
      prerequisites: ["Binary Search Trees (BSTs) & Binary Heaps"],
      description: "File organization strategies, B-tree and B+-tree indexing."
    },

    // ---- Computer Networks (CN) ----
    "OSI & TCP/IP Protocol Layers": {
      topic: "OSI & TCP/IP Protocol Layers",
      subject: "Computer Networks (CN)",
      prerequisites: [],
      description: "OSI and TCP/IP layering models and their responsibilities."
    },
    "Data Link Layer (Framing, Error Detection, MAC, Ethernet Bridging)": {
      topic: "Data Link Layer (Framing, Error Detection, MAC, Ethernet Bridging)",
      subject: "Computer Networks (CN)",
      prerequisites: ["OSI & TCP/IP Protocol Layers"],
      description: "Framing, error detection, MAC protocols, Ethernet bridging."
    },
    "Fragmentation and IP Addressing (IPv4, IPv6, CIDR, Basics of IP support Protocols (ARP, DHCP, ICMP), NAT)": {
      topic: "Fragmentation and IP Addressing (IPv4, IPv6, CIDR, Basics of IP support Protocols (ARP, DHCP, ICMP), NAT)",
      subject: "Computer Networks (CN)",
      prerequisites: ["OSI & TCP/IP Protocol Layers"],
      description: "IP addressing, subnetting, CIDR, ARP/DHCP/ICMP, NAT."
    },
    "Routing Protocols (Shortest Path, Flooding, Distance Vector, Link State Routing)": {
      topic: "Routing Protocols (Shortest Path, Flooding, Distance Vector, Link State Routing)",
      subject: "Computer Networks (CN)",
      prerequisites: [
        "Fragmentation and IP Addressing (IPv4, IPv6, CIDR, Basics of IP support Protocols (ARP, DHCP, ICMP), NAT)",
        "Graph Traversals (BFS, DFS) & Single-Source Shortest Paths"
      ],
      description: "Distance vector, link state, and shortest-path routing algorithms."
    },
    "Transport Layer (Flow Control and Congestion Control, TCP, UDP, Sockets)": {
      topic: "Transport Layer (Flow Control and Congestion Control, TCP, UDP, Sockets)",
      subject: "Computer Networks (CN)",
      prerequisites: ["Routing Protocols (Shortest Path, Flooding, Distance Vector, Link State Routing)"],
      description: "TCP/UDP, flow and congestion control, socket programming basics."
    },
    "Application Layer (DNS, SMTP, HTTP, FTP, Email) & Security": {
      topic: "Application Layer (DNS, SMTP, HTTP, FTP, Email) & Security",
      subject: "Computer Networks (CN)",
      prerequisites: ["Transport Layer (Flow Control and Congestion Control, TCP, UDP, Sockets)"],
      description: "DNS, SMTP, HTTP, FTP, and application-layer security basics."
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
