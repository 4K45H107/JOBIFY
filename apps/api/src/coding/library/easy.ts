import { lines, numbers, type ProblemDefinition, tokens } from "./types";

const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const WORDS = ["job", "offer", "remote", "team", "skill", "hire", "code", "data", "cloud", "test"];

export const easyProblems: ProblemDefinition[] = [
  {
    slug: "sum-of-two-integers",
    title: "Sum of Two Integers",
    difficulty: "EASY",
    topics: ["math"],
    statement: "Read two integers a and b and print their sum.",
    inputFormat: "One line with two integers a and b, separated by a space.",
    outputFormat: "Print a single integer: a + b.",
    constraints: ["-10^9 ≤ a, b ≤ 10^9"],
    samples: [{ input: "3 5\n" }, { input: "-7 2\n" }],
    hidden: (rng) => [
      "0 0\n",
      "1000000000 1000000000\n",
      "-1000000000 -1000000000\n",
      ...Array.from({ length: 5 }, () => `${rng.int(-1e9, 1e9)} ${rng.int(-1e9, 1e9)}\n`),
    ],
    solve: (input) => {
      const [a, b] = numbers(input);
      return String(a! + b!);
    },
  },
  {
    slug: "reverse-a-string",
    title: "Reverse a String",
    difficulty: "EASY",
    topics: ["strings"],
    statement: "Print the given line of text backwards, character by character.",
    inputFormat: "One line of text s. It may contain spaces.",
    outputFormat: "Print s reversed.",
    constraints: ["1 ≤ |s| ≤ 1000", "s contains printable ASCII characters only"],
    samples: [{ input: "jobify\n" }, { input: "hello world\n", explanation: "Spaces move too." }],
    hidden: (rng) => [
      "a\n",
      "racecar\n",
      "Ab Cd 12!\n",
      ...Array.from(
        { length: 5 },
        () => `${rng.string(rng.int(5, 200), `${LETTERS}ABC 123`).trim() || "x"}\n`,
      ),
    ],
    solve: (input) => [...lines(input)[0]!].reverse().join(""),
  },
  {
    slug: "fizzbuzz",
    title: "FizzBuzz",
    difficulty: "EASY",
    topics: ["math", "loops"],
    statement:
      "For every number from 1 to n, print Fizz if it is divisible by 3, Buzz if it is divisible by 5, FizzBuzz if it is divisible by both, and the number itself otherwise.",
    inputFormat: "One integer n.",
    outputFormat: "n lines, one per number from 1 to n.",
    constraints: ["1 ≤ n ≤ 1000"],
    samples: [{ input: "5\n" }, { input: "15\n" }],
    hidden: (rng) => [
      "1\n",
      "3\n",
      "1000\n",
      ...Array.from({ length: 5 }, () => `${rng.int(2, 999)}\n`),
    ],
    solve: (input) => {
      const n = numbers(input)[0]!;
      const out: string[] = [];
      for (let i = 1; i <= n; i++)
        out.push(
          i % 15 === 0 ? "FizzBuzz" : i % 3 === 0 ? "Fizz" : i % 5 === 0 ? "Buzz" : String(i),
        );
      return out.join("\n");
    },
  },
  {
    slug: "count-vowels",
    title: "Count the Vowels",
    difficulty: "EASY",
    topics: ["strings"],
    statement: "Count how many vowels (a, e, i, o, u, in either case) the line of text contains.",
    inputFormat: "One line of text s.",
    outputFormat: "Print the number of vowels.",
    constraints: ["1 ≤ |s| ≤ 1000"],
    samples: [
      { input: "Software Engineer\n" },
      { input: "rhythm\n", explanation: "y isn't a vowel here." },
    ],
    hidden: (rng) => [
      "AEIOU aeiou\n",
      "bcdfg\n",
      ...Array.from(
        { length: 6 },
        () => `${rng.string(rng.int(10, 300), `${LETTERS}AEIOU `).trim() || "a"}\n`,
      ),
    ],
    solve: (input) => String((lines(input)[0]!.match(/[aeiou]/gi) ?? []).length),
  },
  {
    slug: "largest-number",
    title: "Largest Number",
    difficulty: "EASY",
    topics: ["arrays"],
    statement: "Given a list of integers, print the largest one.",
    inputFormat: "The first line has n. The second line has n integers.",
    outputFormat: "Print the largest integer.",
    constraints: ["1 ≤ n ≤ 10^5", "-10^9 ≤ each integer ≤ 10^9"],
    samples: [
      { input: "5\n3 9 -2 9 4\n" },
      { input: "3\n-5 -1 -8\n", explanation: "All negative." },
    ],
    hidden: (rng) => [
      "1\n42\n",
      "4\n-1000000000 -1000000000 -1000000000 -1000000000\n",
      ...Array.from({ length: 6 }, () => {
        const n = rng.int(2, 2000);
        return `${n}\n${rng.ints(n, -1e9, 1e9).join(" ")}\n`;
      }),
    ],
    solve: (input) => {
      const [n, ...rest] = numbers(input);
      return String(Math.max(...rest.slice(0, n)));
    },
  },
  {
    slug: "palindrome-check",
    title: "Palindrome Check",
    difficulty: "EASY",
    topics: ["strings", "two-pointers"],
    statement:
      "Decide whether the line reads the same forwards and backwards, looking only at letters and digits and ignoring case. A line with no letters or digits counts as a palindrome.",
    inputFormat: "One line of text s.",
    outputFormat: "Print YES or NO.",
    constraints: ["1 ≤ |s| ≤ 10^5"],
    samples: [{ input: "A man, a plan, a canal: Panama\n" }, { input: "Jobify\n" }],
    hidden: (rng) => {
      const pal = () => {
        const half = rng.string(rng.int(1, 300), `${LETTERS}0123456789`);
        return half + (rng.int(0, 1) ? rng.pick([..."xyz7"]) : "") + [...half].reverse().join("");
      };
      return [
        "!!!\n",
        "No lemon, no melon\n",
        "ab\n",
        `${pal()}\n`,
        `${pal().toUpperCase()}\n`,
        `${pal()}q\n`,
        `${rng.string(200, LETTERS)}\n`,
        "Was it a car or a cat I saw?\n",
      ];
    },
    solve: (input) => {
      const s = lines(input)[0]!
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      return s === [...s].reverse().join("") ? "YES" : "NO";
    },
  },
  {
    slug: "second-largest",
    title: "Second Largest Value",
    difficulty: "EASY",
    topics: ["arrays"],
    statement:
      "Print the second-largest distinct value in the list. If all values are equal, print NONE.",
    inputFormat: "The first line has n. The second line has n integers.",
    outputFormat: "Print the second-largest distinct value, or NONE.",
    constraints: ["1 ≤ n ≤ 10^5", "-10^9 ≤ each integer ≤ 10^9"],
    samples: [
      { input: "5\n4 1 7 7 3\n", explanation: "7 is the largest; the next distinct value is 4." },
      { input: "3\n5 5 5\n" },
    ],
    hidden: (rng) => [
      "1\n9\n",
      "2\n-3 -8\n",
      "4\n2 2 1 2\n",
      ...Array.from({ length: 5 }, () => {
        const n = rng.int(2, 2000);
        return `${n}\n${rng.ints(n, -50, 50).join(" ")}\n`;
      }),
    ],
    solve: (input) => {
      const [n, ...rest] = numbers(input);
      const distinct = [...new Set(rest.slice(0, n))].sort((a, b) => b - a);
      return distinct.length < 2 ? "NONE" : String(distinct[1]);
    },
  },
  {
    slug: "digit-sum",
    title: "Digit Sum",
    difficulty: "EASY",
    topics: ["math", "strings"],
    statement:
      "Given a non-negative integer that may be far too large for normal number types, print the sum of its digits.",
    inputFormat: "One line with the integer n (no leading zeros unless n is 0).",
    outputFormat: "Print the sum of the digits of n.",
    constraints: ["n has between 1 and 1000 digits"],
    samples: [{ input: "12345\n" }, { input: "0\n" }],
    hidden: (rng) => [
      "9\n",
      `${"9".repeat(1000)}\n`,
      "1000000000000000000000\n",
      ...Array.from(
        { length: 5 },
        () => `${rng.int(1, 9)}${rng.string(rng.int(1, 600), "0123456789")}\n`,
      ),
    ],
    solve: (input) => String([...tokens(input)[0]!].reduce((s, d) => s + Number(d), 0)),
  },
  {
    slug: "leap-year",
    title: "Leap Year",
    difficulty: "EASY",
    topics: ["math"],
    statement:
      "A year is a leap year if it is divisible by 4, except years divisible by 100, which are leap years only if they are also divisible by 400. Decide whether the given year is a leap year.",
    inputFormat: "One integer y.",
    outputFormat: "Print YES or NO.",
    constraints: ["1 ≤ y ≤ 10^9"],
    samples: [
      { input: "2024\n" },
      { input: "1900\n", explanation: "Divisible by 100 but not by 400." },
    ],
    hidden: (rng) => [
      "2000\n",
      "1\n",
      "4\n",
      "2100\n",
      "1600\n",
      ...Array.from({ length: 3 }, () => `${rng.int(1, 1e9)}\n`),
    ],
    solve: (input) => {
      const y = numbers(input)[0]!;
      return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? "YES" : "NO";
    },
  },
  {
    slug: "count-words",
    title: "Count the Words",
    difficulty: "EASY",
    topics: ["strings"],
    statement:
      "Count the words in the line. Words are separated by one or more spaces; there may be spaces at the start or end.",
    inputFormat: "One line of text (it may be empty or contain only spaces).",
    outputFormat: "Print the number of words.",
    constraints: ["0 ≤ |s| ≤ 10^4"],
    samples: [{ input: "We are hiring engineers\n" }, { input: "   remote    first   \n" }],
    hidden: (rng) => [
      "\n",
      "     \n",
      "one\n",
      ...Array.from({ length: 5 }, () => {
        const n = rng.int(1, 300);
        return `${Array.from({ length: n }, () => rng.pick(WORDS) + " ".repeat(rng.int(1, 3))).join("")}\n`;
      }),
    ],
    solve: (input) => String(tokens(lines(input)[0] ?? "").length),
  },
];
