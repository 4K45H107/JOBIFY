import type { Rng } from "./rng";
import { lines, numbers, type ProblemDefinition } from "./types";

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

/** r rows of c characters from the alphabet, with first-line "r c". */
function gridInput(r: number, c: number, cells: string[][]): string {
  return `${r} ${c}\n${cells.map((row) => row.join("")).join("\n")}\n`;
}

function randomGrid(
  rng: Rng,
  r: number,
  c: number,
  wall: string,
  open: string,
  wallChance: number,
) {
  return Array.from({ length: r }, () =>
    Array.from({ length: c }, () => (rng.int(1, 100) <= wallChance ? wall : open)),
  );
}

/** Classic O(n·m) table for two strings. */
function lcsLength(a: string, b: string): number {
  let prev = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array<number>(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++)
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1]! + 1 : Math.max(prev[j]!, cur[j - 1]!);
    prev = cur;
  }
  return prev[b.length]!;
}

export const hardProblems: ProblemDefinition[] = [
  {
    slug: "longest-increasing-subsequence",
    title: "Longest Increasing Subsequence",
    difficulty: "HARD",
    topics: ["dynamic-programming", "binary-search"],
    statement:
      "A subsequence keeps some elements in their original order (not necessarily adjacent). Find the length of the longest strictly increasing subsequence.",
    inputFormat: "The first line has n. The second line has n integers.",
    outputFormat: "Print the length.",
    constraints: ["1 ≤ n ≤ 2·10^5", "-10^9 ≤ each integer ≤ 10^9"],
    samples: [
      { input: "8\n10 9 2 5 3 7 101 18\n", explanation: "For example 2 3 7 101." },
      { input: "4\n5 5 5 5\n", explanation: "Strictly increasing: equal values don't count." },
    ],
    hidden: (rng) => [
      "1\n3\n",
      "5\n1 2 3 4 5\n",
      "5\n5 4 3 2 1\n",
      ...Array.from({ length: 5 }, () => {
        const n = rng.int(10, 3000);
        return `${n}\n${rng.ints(n, -1e9, 1e9).join(" ")}\n`;
      }),
    ],
    solve: (input) => {
      const [n, ...a] = numbers(input);
      const tails: number[] = [];
      for (const v of a.slice(0, n)) {
        let lo = 0;
        let hi = tails.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (tails[mid]! < v) lo = mid + 1;
          else hi = mid;
        }
        tails[lo] = v;
      }
      return String(tails.length);
    },
  },
  {
    slug: "coin-change",
    title: "Coin Change",
    difficulty: "HARD",
    topics: ["dynamic-programming"],
    statement:
      "Using unlimited coins of the given values, make exactly the target amount with as few coins as possible. Print -1 if it can't be done.",
    inputFormat:
      "The first line has n (the number of coin values) and the amount. The second line has the n coin values.",
    outputFormat: "Print the fewest coins, or -1.",
    constraints: ["1 ≤ n ≤ 100", "1 ≤ coin ≤ 10^4", "0 ≤ amount ≤ 10^4"],
    samples: [{ input: "3 11\n1 2 5\n", explanation: "5 + 5 + 1." }, { input: "1 3\n2\n" }],
    hidden: (rng) => [
      "1 0\n7\n",
      "3 6\n1 3 4\n",
      "2 7\n2 4\n",
      ...Array.from({ length: 5 }, () => {
        const n = rng.int(1, 8);
        return `${n} ${rng.int(1, 1e4)}\n${rng.ints(n, 2, 500).join(" ")}\n`;
      }),
    ],
    solve: (input) => {
      const [n, amount, ...coins] = numbers(input);
      const best = new Array<number>(amount! + 1).fill(Infinity);
      best[0] = 0;
      for (let x = 1; x <= amount!; x++)
        for (const c of coins.slice(0, n))
          if (c <= x) best[x] = Math.min(best[x]!, best[x - c]! + 1);
      return best[amount!] === Infinity ? "-1" : String(best[amount!]);
    },
  },
  {
    slug: "edit-distance",
    title: "Edit Distance",
    difficulty: "HARD",
    topics: ["dynamic-programming", "strings"],
    statement:
      "Find the fewest single-character edits (insert, delete or replace a character) that turn the first word into the second.",
    inputFormat: "Two lines, each with one lowercase word.",
    outputFormat: "Print the edit distance.",
    constraints: ["1 ≤ length of each word ≤ 2000"],
    samples: [
      { input: "horse\nros\n", explanation: "horse → rorse → rose → ros." },
      { input: "intention\nexecution\n" },
    ],
    hidden: (rng) => [
      "a\na\n",
      "a\nb\n",
      "abc\nabcdef\n",
      ...Array.from(
        { length: 5 },
        () =>
          `${rng.string(rng.int(1, 600), LETTERS.slice(0, 6))}\n${rng.string(rng.int(1, 600), LETTERS.slice(0, 6))}\n`,
      ),
    ],
    solve: (input) => {
      const [a, b] = lines(input).map((l) => l.trim());
      let prev = Array.from({ length: b!.length + 1 }, (_, j) => j);
      for (let i = 1; i <= a!.length; i++) {
        const cur = [i];
        for (let j = 1; j <= b!.length; j++)
          cur[j] =
            a![i - 1] === b![j - 1]
              ? prev[j - 1]!
              : 1 + Math.min(prev[j - 1]!, prev[j]!, cur[j - 1]!);
        prev = cur;
      }
      return String(prev[b!.length]);
    },
  },
  {
    slug: "grid-shortest-path",
    title: "Shortest Path in a Grid",
    difficulty: "HARD",
    topics: ["graphs", "bfs"],
    statement:
      "Walk from S to E through open cells (.), one step up, down, left or right at a time. Walls (#) can't be entered. Find the fewest steps, or -1 if E can't be reached.",
    inputFormat:
      "The first line has r and c. Each of the next r lines has c characters from . # S E (exactly one S and one E).",
    outputFormat: "Print the fewest steps, or -1.",
    constraints: ["1 ≤ r, c ≤ 1000"],
    samples: [
      { input: "3 4\nS..#\n.#..\n...E\n" },
      { input: "2 3\nS#E\n.#.\n", explanation: "The wall column blocks every route." },
    ],
    hidden: (rng) => {
      const make = (r: number, c: number, wallChance: number) => {
        const cells = randomGrid(rng, r, c, "#", ".", wallChance);
        cells[0]![0] = "S";
        cells[r - 1]![c - 1] = "E";
        return gridInput(r, c, cells);
      };
      return [
        "1 2\nSE\n",
        "1 3\nS#E\n",
        "3 3\nS..\n...\n..E\n",
        make(30, 30, 20),
        make(40, 60, 30),
        make(60, 40, 35),
        make(50, 50, 45),
        make(20, 80, 25),
      ];
    },
    solve: (input) => {
      const [first, ...rows] = lines(input);
      const [r, c] = first!.trim().split(/\s+/).map(Number) as [number, number];
      const grid = rows.slice(0, r).map((row) => row.trim());
      const dist = new Int32Array(r * c).fill(-1);
      const queue: number[] = [];
      for (let i = 0; i < r; i++)
        for (let j = 0; j < c; j++) {
          if (grid[i]![j] !== "S") continue;
          queue.push(i * c + j);
          dist[i * c + j] = 0;
        }
      for (let head = 0; head < queue.length; head++) {
        const cell = queue[head]!;
        const [i, j] = [Math.floor(cell / c), cell % c];
        if (grid[i]![j] === "E") return String(dist[cell]);
        for (const [di, dj] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const [ni, nj] = [i + di, j + dj];
          if (ni < 0 || nj < 0 || ni >= r || nj >= c || grid[ni]![nj] === "#") continue;
          if (dist[ni * c + nj] !== -1) continue;
          dist[ni * c + nj] = dist[cell]! + 1;
          queue.push(ni * c + nj);
        }
      }
      return "-1";
    },
  },
  {
    slug: "number-of-islands",
    title: "Number of Islands",
    difficulty: "HARD",
    topics: ["graphs", "bfs"],
    statement:
      "The grid is a map of land (1) and water (0). An island is a group of land cells connected up, down, left or right. Count the islands.",
    inputFormat:
      "The first line has r and c. Each of the next r lines has c characters, each 0 or 1.",
    outputFormat: "Print the number of islands.",
    constraints: ["1 ≤ r, c ≤ 1000"],
    samples: [
      { input: "4 5\n11000\n11000\n00100\n00011\n" },
      { input: "2 2\n10\n01\n", explanation: "Diagonal cells aren't connected." },
    ],
    hidden: (rng) => [
      "1 1\n0\n",
      "1 1\n1\n",
      "3 3\n111\n111\n111\n",
      ...[20, 40, 55, 70, 80].map((landChance) =>
        gridInput(40, 50, randomGrid(rng, 40, 50, "1", "0", landChance)),
      ),
    ],
    solve: (input) => {
      const [first, ...rows] = lines(input);
      const [r, c] = first!.trim().split(/\s+/).map(Number) as [number, number];
      const grid = rows.slice(0, r).map((row) => [...row.trim()]);
      let islands = 0;
      for (let i = 0; i < r; i++)
        for (let j = 0; j < c; j++) {
          if (grid[i]![j] !== "1") continue;
          islands++;
          const stack = [[i, j]];
          grid[i]![j] = "0";
          while (stack.length) {
            const [x, y] = stack.pop()!;
            for (const [dx, dy] of [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ] as const) {
              const [nx, ny] = [x! + dx, y! + dy];
              if (nx < 0 || ny < 0 || nx >= r || ny >= c || grid[nx]![ny] !== "1") continue;
              grid[nx]![ny] = "0";
              stack.push([nx, ny]);
            }
          }
        }
      return String(islands);
    },
  },
  {
    slug: "shortest-route",
    title: "Shortest Route",
    difficulty: "HARD",
    topics: ["graphs", "shortest-path"],
    statement:
      "Cities are numbered 1 to n and joined by two-way roads, each with a length. Find the length of the shortest route from city 1 to city n, or -1 if there is none.",
    inputFormat:
      "The first line has n and m. Each of the next m lines has u, v and w: a road of length w between u and v.",
    outputFormat: "Print the shortest distance, or -1.",
    constraints: ["2 ≤ n ≤ 10^5", "0 ≤ m ≤ 2·10^5", "1 ≤ w ≤ 10^6"],
    samples: [
      {
        input: "4 5\n1 2 4\n1 3 1\n3 2 2\n2 4 5\n3 4 9\n",
        explanation: "1 → 3 → 2 → 4 costs 1 + 2 + 5.",
      },
      { input: "3 1\n1 2 7\n" },
    ],
    hidden: (rng) => [
      "2 0\n",
      "2 2\n1 2 5\n1 2 3\n",
      ...Array.from({ length: 6 }, () => {
        const n = rng.int(3, 400);
        const m = rng.int(n - 1, 4 * n);
        const roads = Array.from(
          { length: m },
          () => `${rng.int(1, n)} ${rng.int(1, n)} ${rng.int(1, 1e6)}`,
        );
        return `${n} ${m}\n${roads.join("\n")}${m ? "\n" : ""}`;
      }),
    ],
    solve: (input) => {
      const [n, m, ...rest] = numbers(input);
      const adj: [number, number][][] = Array.from({ length: n! + 1 }, () => []);
      for (let i = 0; i < m!; i++) {
        const [u, v, w] = [rest[3 * i]!, rest[3 * i + 1]!, rest[3 * i + 2]!];
        adj[u]!.push([v, w]);
        adj[v]!.push([u, w]);
      }
      // Dijkstra with a binary heap of [distance, node].
      const dist = new Array<number>(n! + 1).fill(Infinity);
      const heap: [number, number][] = [[0, 1]];
      dist[1] = 0;
      const push = (item: [number, number]) => {
        heap.push(item);
        let i = heap.length - 1;
        while (i > 0) {
          const p = (i - 1) >> 1;
          if (heap[p]![0] <= heap[i]![0]) break;
          [heap[p], heap[i]] = [heap[i]!, heap[p]!];
          i = p;
        }
      };
      const pop = (): [number, number] => {
        const top = heap[0]!;
        const last = heap.pop()!;
        if (heap.length) {
          heap[0] = last;
          let i = 0;
          for (;;) {
            const [l, r] = [2 * i + 1, 2 * i + 2];
            let s = i;
            if (l < heap.length && heap[l]![0] < heap[s]![0]) s = l;
            if (r < heap.length && heap[r]![0] < heap[s]![0]) s = r;
            if (s === i) break;
            [heap[s], heap[i]] = [heap[i]!, heap[s]!];
            i = s;
          }
        }
        return top;
      };
      while (heap.length) {
        const [d, u] = pop();
        if (d > dist[u]!) continue;
        for (const [v, w] of adj[u]!)
          if (d + w < dist[v]!) {
            dist[v] = d + w;
            push([dist[v]!, v]);
          }
      }
      return dist[n!] === Infinity ? "-1" : String(dist[n!]);
    },
  },
  {
    slug: "longest-common-subsequence",
    title: "Longest Common Subsequence",
    difficulty: "HARD",
    topics: ["dynamic-programming", "strings"],
    statement:
      "Find the length of the longest sequence of characters that appears, in order but not necessarily side by side, in both words.",
    inputFormat: "Two lines, each with one lowercase word.",
    outputFormat: "Print the length.",
    constraints: ["1 ≤ length of each word ≤ 2000"],
    samples: [{ input: "abcde\nace\n", explanation: '"ace" is in both.' }, { input: "abc\ndef\n" }],
    hidden: (rng) => [
      "a\na\n",
      "abc\ncba\n",
      "aaaa\naa\n",
      ...Array.from(
        { length: 5 },
        () =>
          `${rng.string(rng.int(1, 700), LETTERS.slice(0, 5))}\n${rng.string(rng.int(1, 700), LETTERS.slice(0, 5))}\n`,
      ),
    ],
    solve: (input) => {
      const [a, b] = lines(input).map((l) => l.trim());
      return String(lcsLength(a!, b!));
    },
  },
  {
    slug: "knapsack",
    title: "Knapsack",
    difficulty: "HARD",
    topics: ["dynamic-programming"],
    statement:
      "Each item has a weight and a value, and can be taken at most once. Choose items with total weight at most W to make the total value as large as possible.",
    inputFormat:
      "The first line has n and W. Each of the next n lines has an item's weight and value.",
    outputFormat: "Print the largest total value.",
    constraints: ["1 ≤ n ≤ 100", "1 ≤ W ≤ 10^4", "1 ≤ weight ≤ 10^4", "0 ≤ value ≤ 10^6"],
    samples: [
      { input: "3 50\n10 60\n20 100\n30 120\n", explanation: "Take the last two items." },
      { input: "1 5\n6 100\n", explanation: "The only item is too heavy." },
    ],
    hidden: (rng) => [
      "1 10\n10 7\n",
      "2 3\n2 2\n2 3\n",
      ...Array.from({ length: 6 }, () => {
        const n = rng.int(2, 100);
        const items = Array.from({ length: n }, () => `${rng.int(1, 2000)} ${rng.int(0, 1e6)}`);
        return `${n} ${rng.int(1, 1e4)}\n${items.join("\n")}\n`;
      }),
    ],
    solve: (input) => {
      const [n, W, ...rest] = numbers(input);
      const best = new Array<number>(W! + 1).fill(0);
      for (let i = 0; i < n!; i++) {
        const [w, v] = [rest[2 * i]!, rest[2 * i + 1]!];
        for (let cap = W!; cap >= w; cap--) best[cap] = Math.max(best[cap]!, best[cap - w]! + v);
      }
      return String(best[W!]);
    },
  },
];
