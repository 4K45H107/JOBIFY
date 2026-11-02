import type { Rng } from "./rng";
import { lines, numbers, type ProblemDefinition } from "./types";

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

/** "n\nv1 v2 …\n" for a random list. */
const list = (rng: Rng, n: number, min: number, max: number) =>
  `${n}\n${rng.ints(n, min, max).join(" ")}\n`;

export const mediumProblems: ProblemDefinition[] = [
  {
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "MEDIUM",
    topics: ["arrays", "hashing"],
    statement:
      "Find two different positions i < j whose values add up to the target. If several pairs work, choose the one with the smallest j, and for that j the smallest i. Positions are 1-based.",
    inputFormat: "The first line has n and target. The second line has n integers a1 … an.",
    outputFormat: "Print i and j separated by a space, or -1 if no pair exists.",
    constraints: ["2 ≤ n ≤ 10^5", "-10^9 ≤ ai, target ≤ 10^9"],
    samples: [{ input: "4 9\n2 7 11 15\n", explanation: "2 + 7 = 9." }, { input: "3 10\n1 2 3\n" }],
    hidden: (rng) => [
      "2 0\n-5 5\n",
      "5 8\n4 4 4 4 4\n",
      "3 -2\n-1 -1 7\n",
      ...Array.from({ length: 5 }, () => {
        const n = rng.int(2, 2000);
        return `${n} ${rng.int(-100, 100)}\n${rng.ints(n, -60, 60).join(" ")}\n`;
      }),
    ],
    solve: (input) => {
      const [n, target, ...a] = numbers(input);
      const firstSeen = new Map<number, number>();
      for (let j = 0; j < n!; j++) {
        const i = firstSeen.get(target! - a[j]!);
        if (i !== undefined) return `${i + 1} ${j + 1}`;
        if (!firstSeen.has(a[j]!)) firstSeen.set(a[j]!, j);
      }
      return "-1";
    },
  },
  {
    slug: "balanced-brackets",
    title: "Balanced Brackets",
    difficulty: "MEDIUM",
    topics: ["stack", "strings"],
    statement:
      "A string of brackets is balanced when every opening bracket is closed by the same kind of bracket, in the right order. Decide whether the given string is balanced.",
    inputFormat: "One line made of the characters ( ) [ ] { } only.",
    outputFormat: "Print YES or NO.",
    constraints: ["1 ≤ |s| ≤ 10^5"],
    samples: [{ input: "{[()()]}\n" }, { input: "([)]\n", explanation: "The brackets cross." }],
    hidden: (rng) => {
      const balanced = (depth: number): string => {
        if (depth === 0) return "";
        const [o, c] = rng.pick([
          ["(", ")"],
          ["[", "]"],
          ["{", "}"],
        ] as const);
        return o + balanced(depth - 1) + c + (rng.int(0, 1) ? balanced(rng.int(0, depth - 1)) : "");
      };
      const big = Array.from({ length: 40 }, () => balanced(rng.int(1, 6))).join("");
      return [
        "(\n",
        ")(\n",
        "()[]{}\n",
        `${big}\n`,
        `${big})\n`,
        `${big.slice(1)}\n`,
        "((((((((((\n",
        "{[]}\n",
      ];
    },
    solve: (input) => {
      const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
      const stack: string[] = [];
      for (const ch of lines(input)[0]!.trim()) {
        if ("([{".includes(ch)) stack.push(ch);
        else if (stack.pop() !== pairs[ch]) return "NO";
      }
      return stack.length === 0 ? "YES" : "NO";
    },
  },
  {
    slug: "anagram-check",
    title: "Anagram Check",
    difficulty: "MEDIUM",
    topics: ["strings", "hashing", "sorting"],
    statement:
      "Two words are anagrams when one is a rearrangement of the other's letters. Decide whether the two words are anagrams.",
    inputFormat: "Two lines, each with one lowercase word.",
    outputFormat: "Print YES or NO.",
    constraints: ["1 ≤ length of each word ≤ 10^5"],
    samples: [{ input: "listen\nsilent\n" }, { input: "apple\npaper\n" }],
    hidden: (rng) => {
      const word = rng.string(rng.int(50, 2000), LETTERS);
      const shuffled = rng.shuffle([...word]).join("");
      return [
        "a\na\n",
        "ab\nabc\n",
        "aab\nabb\n",
        `${word}\n${shuffled}\n`,
        `${word}\n${shuffled.slice(1)}z\n`,
        `${word}\n${word}\n`,
        `${rng.string(300, "ab")}\n${rng.string(300, "ab")}\n`,
        "evil\nvile\n",
      ];
    },
    solve: (input) => {
      const [a, b] = lines(input).map((l) => [...l.trim()].sort().join(""));
      return a === b ? "YES" : "NO";
    },
  },
  {
    slug: "longest-unique-substring",
    title: "Longest Substring Without Repeats",
    difficulty: "MEDIUM",
    topics: ["strings", "sliding-window", "hashing"],
    statement:
      "Find the length of the longest run of consecutive characters in which no character appears twice.",
    inputFormat: "One line with a lowercase string s.",
    outputFormat: "Print the length.",
    constraints: ["1 ≤ |s| ≤ 10^5"],
    samples: [{ input: "abcabcbb\n", explanation: '"abc" has length 3.' }, { input: "bbbbb\n" }],
    hidden: (rng) => [
      "a\n",
      `${LETTERS}\n`,
      "pwwkew\n",
      "abba\n",
      ...Array.from(
        { length: 4 },
        () => `${rng.string(rng.int(100, 3000), LETTERS.slice(0, rng.int(3, 26)))}\n`,
      ),
    ],
    solve: (input) => {
      const s = lines(input)[0]!.trim();
      const last = new Map<string, number>();
      let start = 0;
      let best = 0;
      [...s].forEach((ch, i) => {
        const seen = last.get(ch);
        if (seen !== undefined && seen >= start) start = seen + 1;
        last.set(ch, i);
        best = Math.max(best, i - start + 1);
      });
      return String(best);
    },
  },
  {
    slug: "merge-intervals",
    title: "Merge Intervals",
    difficulty: "MEDIUM",
    topics: ["sorting", "arrays"],
    statement:
      "Merge all overlapping intervals. Intervals that touch, such as [1, 3] and [3, 5], also merge.",
    inputFormat: "The first line has n. Each of the next n lines has two integers l and r (l ≤ r).",
    outputFormat:
      "Print k, the number of merged intervals, then k lines with l and r, sorted by l.",
    constraints: ["1 ≤ n ≤ 10^5", "0 ≤ l ≤ r ≤ 10^9"],
    samples: [
      { input: "4\n1 3\n2 6\n8 10\n15 18\n" },
      { input: "2\n1 4\n4 5\n", explanation: "Touching intervals merge." },
    ],
    hidden: (rng) => [
      "1\n5 5\n",
      "3\n1 10\n2 3\n4 5\n",
      "3\n7 8\n1 2\n4 5\n",
      ...Array.from({ length: 5 }, () => {
        const n = rng.int(2, 1000);
        const rows = Array.from({ length: n }, () => {
          const l = rng.int(0, 5000);
          return `${l} ${l + rng.int(0, 40)}`;
        });
        return `${n}\n${rows.join("\n")}\n`;
      }),
    ],
    solve: (input) => {
      const [n, ...rest] = numbers(input);
      const intervals = Array.from({ length: n! }, (_, i) => [rest[2 * i]!, rest[2 * i + 1]!]).sort(
        (a, b) => a[0]! - b[0]!,
      );
      const merged: number[][] = [];
      for (const [l, r] of intervals) {
        const last = merged.at(-1);
        if (last && l! <= last[1]!) last[1] = Math.max(last[1]!, r!);
        else merged.push([l!, r!]);
      }
      return [String(merged.length), ...merged.map(([l, r]) => `${l} ${r}`)].join("\n");
    },
  },
  {
    slug: "most-frequent-value",
    title: "Most Frequent Value",
    difficulty: "MEDIUM",
    topics: ["hashing", "arrays"],
    statement:
      "Print the value that appears most often. If several values tie, print the smallest of them.",
    inputFormat: "The first line has n. The second line has n integers.",
    outputFormat: "Print the most frequent value.",
    constraints: ["1 ≤ n ≤ 10^5", "-10^9 ≤ each integer ≤ 10^9"],
    samples: [
      { input: "6\n4 1 4 2 1 4\n" },
      { input: "4\n3 -1 3 -1\n", explanation: "Tie: -1 is smaller." },
    ],
    hidden: (rng) => [
      "1\n7\n",
      "3\n9 8 7\n",
      ...Array.from({ length: 6 }, () => list(rng, rng.int(2, 3000), -20, 20)),
    ],
    solve: (input) => {
      const [n, ...rest] = numbers(input);
      const counts = new Map<number, number>();
      for (const v of rest.slice(0, n)) counts.set(v, (counts.get(v) ?? 0) + 1);
      let best = Infinity;
      let bestCount = 0;
      for (const [v, c] of counts)
        if (c > bestCount || (c === bestCount && v < best)) [best, bestCount] = [v, c];
      return String(best);
    },
  },
  {
    slug: "rotate-array",
    title: "Rotate an Array",
    difficulty: "MEDIUM",
    topics: ["arrays"],
    statement:
      "Rotate the array k steps to the right: each element moves k places right, and elements that fall off the end wrap around to the start.",
    inputFormat: "The first line has n and k. The second line has n integers.",
    outputFormat: "Print the rotated array, separated by spaces.",
    constraints: ["1 ≤ n ≤ 10^5", "0 ≤ k ≤ 10^9"],
    samples: [
      { input: "5 2\n1 2 3 4 5\n" },
      { input: "3 4\n7 8 9\n", explanation: "4 steps on 3 elements is 1 step." },
    ],
    hidden: (rng) => [
      "1 1000000000\n42\n",
      "4 0\n1 2 3 4\n",
      "4 4\n1 2 3 4\n",
      ...Array.from({ length: 5 }, () => {
        const n = rng.int(2, 2000);
        return `${n} ${rng.int(0, 1e9)}\n${rng.ints(n, -1000, 1000).join(" ")}\n`;
      }),
    ],
    solve: (input) => {
      const [n, k, ...a] = numbers(input);
      const shift = k! % n!;
      const arr = a.slice(0, n);
      return [...arr.slice(n! - shift), ...arr.slice(0, n! - shift)].join(" ");
    },
  },
  {
    slug: "first-occurrence",
    title: "First Occurrence",
    difficulty: "MEDIUM",
    topics: ["binary-search", "arrays"],
    statement:
      "The array is sorted in non-decreasing order. For each query x, print the 1-based position of the first element equal to x, or -1 if x isn't in the array.",
    inputFormat:
      "The first line has n and q. The second line has the n sorted integers. The third line has q queries.",
    outputFormat: "Print q lines, one answer per query.",
    constraints: ["1 ≤ n, q ≤ 10^5", "-10^9 ≤ values ≤ 10^9"],
    samples: [{ input: "6 3\n1 2 2 2 5 9\n2 9 4\n" }, { input: "1 2\n7\n7 8\n" }],
    hidden: (rng) =>
      Array.from({ length: 8 }, () => {
        const n = rng.int(1, 2000);
        const q = rng.int(1, 500);
        const a = rng.ints(n, -300, 300).sort((x, y) => x - y);
        return `${n} ${q}\n${a.join(" ")}\n${rng.ints(q, -320, 320).join(" ")}\n`;
      }),
    solve: (input) => {
      const [n, q, ...rest] = numbers(input);
      const a = rest.slice(0, n);
      return rest
        .slice(n, n! + q!)
        .map((x) => {
          let lo = 0;
          let hi = a.length;
          while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (a[mid]! < x) lo = mid + 1;
            else hi = mid;
          }
          return lo < a.length && a[lo] === x ? String(lo + 1) : "-1";
        })
        .join("\n");
    },
  },
  {
    slug: "range-sums",
    title: "Range Sum Queries",
    difficulty: "MEDIUM",
    topics: ["prefix-sums", "arrays"],
    statement:
      "Answer q queries: each asks for the sum of the elements from position l to r (1-based, inclusive).",
    inputFormat:
      "The first line has n and q. The second line has n integers. Each of the next q lines has l and r.",
    outputFormat: "Print q lines, one sum per query.",
    constraints: ["1 ≤ n, q ≤ 10^5", "-10^9 ≤ values ≤ 10^9", "1 ≤ l ≤ r ≤ n"],
    samples: [{ input: "5 3\n1 2 3 4 5\n1 3\n2 5\n4 4\n" }, { input: "3 1\n-5 10 -5\n1 3\n" }],
    hidden: (rng) =>
      Array.from({ length: 8 }, () => {
        const n = rng.int(1, 2000);
        const q = rng.int(1, 300);
        const queries = Array.from({ length: q }, () => {
          const l = rng.int(1, n);
          return `${l} ${rng.int(l, n)}`;
        });
        return `${n} ${q}\n${rng.ints(n, -1e9, 1e9).join(" ")}\n${queries.join("\n")}\n`;
      }),
    solve: (input) => {
      const [n, q, ...rest] = numbers(input);
      const prefix = [0];
      for (let i = 0; i < n!; i++) prefix.push(prefix[i]! + rest[i]!);
      const out: string[] = [];
      for (let i = 0; i < q!; i++) {
        const l = rest[n! + 2 * i]!;
        const r = rest[n! + 2 * i + 1]!;
        out.push(String(prefix[r]! - prefix[l - 1]!));
      }
      return out.join("\n");
    },
  },
  {
    slug: "spiral-matrix",
    title: "Spiral Order",
    difficulty: "MEDIUM",
    topics: ["matrix", "simulation"],
    statement:
      "Print the elements of the matrix in spiral order: start at the top-left, go right, then down, then left, then up, moving inwards.",
    inputFormat: "The first line has r and c. Each of the next r lines has c integers.",
    outputFormat: "Print all r × c elements in spiral order, separated by spaces.",
    constraints: ["1 ≤ r, c ≤ 100"],
    samples: [{ input: "3 3\n1 2 3\n4 5 6\n7 8 9\n" }, { input: "2 4\n1 2 3 4\n5 6 7 8\n" }],
    hidden: (rng) => [
      "1 1\n5\n",
      "1 4\n1 2 3 4\n",
      "4 1\n1\n2\n3\n4\n",
      ...Array.from({ length: 5 }, () => {
        const r = rng.int(2, 40);
        const c = rng.int(2, 40);
        const rows = Array.from({ length: r }, () => rng.ints(c, -99, 99).join(" "));
        return `${r} ${c}\n${rows.join("\n")}\n`;
      }),
    ],
    solve: (input) => {
      const [r, c, ...v] = numbers(input);
      const at = (i: number, j: number) => v[i * c! + j]!;
      const out: number[] = [];
      let [top, bottom, left, right] = [0, r! - 1, 0, c! - 1];
      while (top <= bottom && left <= right) {
        for (let j = left; j <= right; j++) out.push(at(top, j));
        for (let i = top + 1; i <= bottom; i++) out.push(at(i, right));
        if (top < bottom) for (let j = right - 1; j >= left; j--) out.push(at(bottom, j));
        if (left < right) for (let i = bottom - 1; i > top; i--) out.push(at(i, left));
        top++;
        bottom--;
        left++;
        right--;
      }
      return out.join(" ");
    },
  },
  {
    slug: "best-time-to-trade",
    title: "Best Time to Buy and Sell",
    difficulty: "MEDIUM",
    topics: ["arrays", "greedy"],
    statement:
      "You know a stock's price for each of the next n days. Buy once and sell once on a later day to make the biggest profit. If no trade makes money, the profit is 0.",
    inputFormat: "The first line has n. The second line has the n prices.",
    outputFormat: "Print the maximum profit.",
    constraints: ["1 ≤ n ≤ 10^5", "0 ≤ price ≤ 10^9"],
    samples: [
      { input: "6\n7 1 5 3 6 4\n", explanation: "Buy at 1, sell at 6." },
      { input: "5\n7 6 4 3 1\n" },
    ],
    hidden: (rng) => [
      "1\n10\n",
      "2\n1 1000000000\n",
      ...Array.from({ length: 6 }, () => list(rng, rng.int(2, 3000), 0, 1e6)),
    ],
    solve: (input) => {
      const [n, ...p] = numbers(input);
      let low = Infinity;
      let best = 0;
      for (const price of p.slice(0, n)) {
        low = Math.min(low, price);
        best = Math.max(best, price - low);
      }
      return String(best);
    },
  },
  {
    slug: "maximum-subarray",
    title: "Maximum Subarray Sum",
    difficulty: "MEDIUM",
    topics: ["dynamic-programming", "arrays"],
    statement: "Find the largest sum of a non-empty run of consecutive elements.",
    inputFormat: "The first line has n. The second line has n integers.",
    outputFormat: "Print the largest sum.",
    constraints: ["1 ≤ n ≤ 10^5", "-10^4 ≤ each integer ≤ 10^4"],
    samples: [
      { input: "9\n-2 1 -3 4 -1 2 1 -5 4\n", explanation: "4 -1 2 1 sums to 6." },
      { input: "3\n-3 -1 -2\n", explanation: "The run must not be empty." },
    ],
    hidden: (rng) => [
      "1\n-7\n",
      "4\n1 2 3 4\n",
      ...Array.from({ length: 6 }, () => list(rng, rng.int(2, 3000), -1e4, 1e4)),
    ],
    solve: (input) => {
      const [n, ...a] = numbers(input);
      let best = -Infinity;
      let current = 0;
      for (const v of a.slice(0, n)) {
        current = Math.max(v, current + v);
        best = Math.max(best, current);
      }
      return String(best);
    },
  },
];
