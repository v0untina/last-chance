export type SupportedLanguage = "javascript" | "python" | "java" | "cpp" | "go";

export interface LanguageInfo {
  id: SupportedLanguage;
  label: string;
  monacoLang: string;
  extension: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { id: "javascript", label: "JavaScript", monacoLang: "javascript", extension: "js" },
  { id: "python", label: "Python", monacoLang: "python", extension: "py" },
  { id: "java", label: "Java", monacoLang: "java", extension: "java" },
  { id: "cpp", label: "C++", monacoLang: "cpp", extension: "cpp" },
  { id: "go", label: "Go", monacoLang: "go", extension: "go" },
];

type Templates = Record<string, Record<SupportedLanguage, string>>;

export const templates: Templates = {
  "bubble-sort": {
    javascript: `function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}`,
    python: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        for j in range(n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr`,
    java: `public class Solution {
    public static int[] bubbleSort(int[] arr) {
        int n = arr.length;
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
        return arr;
    }
}`,
    cpp: `#include <vector>
using namespace std;

vector<int> bubbleSort(vector<int> arr) {
    int n = arr.size();
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                swap(arr[j], arr[j + 1]);
            }
        }
    }
    return arr;
}`,
    go: `func bubbleSort(arr []int) []int {
    n := len(arr)
    for i := 0; i < n-1; i++ {
        for j := 0; j < n-i-1; j++ {
            if arr[j] > arr[j+1] {
                arr[j], arr[j+1] = arr[j+1], arr[j]
            }
        }
    }
    return arr
}`,
  },
  "insertion-sort": {
    javascript: `function insertionSort(arr) {
  const n = arr.length;
  for (let i = 1; i < n; i++) {
    const key = arr[i];
    let j = i - 1;
    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j];
      j--;
    }
    arr[j + 1] = key;
  }
  return arr;
}`,
    python: `def insertion_sort(arr):
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr`,
    java: `public class Solution {
    public static int[] insertionSort(int[] arr) {
        int n = arr.length;
        for (int i = 1; i < n; i++) {
            int key = arr[i];
            int j = i - 1;
            while (j >= 0 && arr[j] > key) {
                arr[j + 1] = arr[j];
                j--;
            }
            arr[j + 1] = key;
        }
        return arr;
    }
}`,
    cpp: `#include <vector>
using namespace std;

vector<int> insertionSort(vector<int> arr) {
    int n = arr.size();
    for (int i = 1; i < n; i++) {
        int key = arr[i];
        int j = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
    return arr;
}`,
    go: `func insertionSort(arr []int) []int {
    n := len(arr)
    for i := 1; i < n; i++ {
        key := arr[i]
        j := i - 1
        for j >= 0 && arr[j] > key {
            arr[j+1] = arr[j]
            j--
        }
        arr[j+1] = key
    }
    return arr
}`,
  },
  "selection-sort": {
    javascript: `function selectionSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    for (let j = i + 1; j < n; j++) {
      if (arr[j] < arr[minIdx]) minIdx = j;
    }
    if (minIdx !== i) {
      [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
    }
  }
  return arr;
}`,
    python: `def selection_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        min_idx = i
        for j in range(i + 1, n):
            if arr[j] < arr[min_idx]:
                min_idx = j
        if min_idx != i:
            arr[i], arr[min_idx] = arr[min_idx], arr[i]
    return arr`,
    java: `public class Solution {
    public static int[] selectionSort(int[] arr) {
        int n = arr.length;
        for (int i = 0; i < n - 1; i++) {
            int minIdx = i;
            for (int j = i + 1; j < n; j++) {
                if (arr[j] < arr[minIdx]) minIdx = j;
            }
            if (minIdx != i) {
                int temp = arr[i];
                arr[i] = arr[minIdx];
                arr[minIdx] = temp;
            }
        }
        return arr;
    }
}`,
    cpp: `#include <vector>
using namespace std;

vector<int> selectionSort(vector<int> arr) {
    int n = arr.size();
    for (int i = 0; i < n - 1; i++) {
        int minIdx = i;
        for (int j = i + 1; j < n; j++) {
            if (arr[j] < arr[minIdx]) minIdx = j;
        }
        if (minIdx != i) swap(arr[i], arr[minIdx]);
    }
    return arr;
}`,
    go: `func selectionSort(arr []int) []int {
    n := len(arr)
    for i := 0; i < n-1; i++ {
        minIdx := i
        for j := i + 1; j < n; j++ {
            if arr[j] < arr[minIdx] {
                minIdx = j
            }
        }
        if minIdx != i {
            arr[i], arr[minIdx] = arr[minIdx], arr[i]
        }
    }
    return arr
}`,
  },
  "binary-search": {
    javascript: `function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}`,
    python: `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`,
    java: `public class Solution {
    public static int binarySearch(int[] arr, int target) {
        int left = 0, right = arr.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (arr[mid] == target) return mid;
            if (arr[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
}`,
    cpp: `#include <vector>
using namespace std;

int binarySearch(vector<int> arr, int target) {
    int left = 0, right = arr.size() - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}`,
    go: `func binarySearch(arr []int, target int) int {
    left, right := 0, len(arr)-1
    for left <= right {
        mid := left + (right-left)/2
        if arr[mid] == target {
            return mid
        } else if arr[mid] < target {
            left = mid + 1
        } else {
            right = mid - 1
        }
    }
    return -1
}`,
  },
  "quick-sort": {
    javascript: `function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[arr.length - 1];
  const left = arr.slice(0, -1).filter(x => x <= pivot);
  const right = arr.slice(0, -1).filter(x => x > pivot);
  return [...quickSort(left), pivot, ...quickSort(right)];
}`,
    python: `def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[-1]
    left = [x for x in arr[:-1] if x <= pivot]
    right = [x for x in arr[:-1] if x > pivot]
    return quick_sort(left) + [pivot] + quick_sort(right)`,
    java: `public class Solution {
    public static int[] quickSort(int[] arr) {
        if (arr.length <= 1) return arr;
        int pivot = arr[arr.length - 1];
        int[] left = Arrays.stream(arr, 0, arr.length - 1).filter(x -> x <= pivot).toArray();
        int[] right = Arrays.stream(arr, 0, arr.length - 1).filter(x -> x > pivot).toArray();
        int[] result = new int[arr.length];
        System.arraycopy(quickSort(left), 0, result, 0, left.length);
        result[left.length] = pivot;
        System.arraycopy(quickSort(right), 0, result, left.length + 1, right.length);
        return result;
    }
}`,
    cpp: `#include <vector>
using namespace std;

vector<int> quickSort(vector<int> arr) {
    if (arr.size() <= 1) return arr;
    int pivot = arr.back();
    arr.pop_back();
    vector<int> left, right;
    for (int x : arr) {
        if (x <= pivot) left.push_back(x);
        else right.push_back(x);
    }
    left = quickSort(left);
    right = quickSort(right);
    left.push_back(pivot);
    left.insert(left.end(), right.begin(), right.end());
    return left;
}`,
    go: `func quickSort(arr []int) []int {
    if len(arr) <= 1 {
        return arr
    }
    pivot := arr[len(arr)-1]
    left := []int{}
    right := []int{}
    for _, x := range arr[:len(arr)-1] {
        if x <= pivot {
            left = append(left, x)
        } else {
            right = append(right, x)
        }
    }
    left = quickSort(left)
    right = quickSort(right)
    return append(append(left, pivot), right...)
}`,
  },
  "merge-sort": {
    javascript: `function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  return merge(left, right);
}
function merge(left, right) {
  const res = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) res.push(left[i++]);
    else res.push(right[j++]);
  }
  return [...res, ...left.slice(i), ...right.slice(j)];
}`,
    python: `def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(left, right):
    res = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            res.append(left[i])
            i += 1
        else:
            res.append(right[j])
            j += 1
    return res + left[i:] + right[j:]`,
    java: `public class Solution {
    public static int[] mergeSort(int[] arr) {
        if (arr.length <= 1) return arr;
        int mid = arr.length / 2;
        int[] left = mergeSort(Arrays.copyOfRange(arr, 0, mid));
        int[] right = mergeSort(Arrays.copyOfRange(arr, mid, arr.length));
        return merge(left, right);
    }
    private static int[] merge(int[] left, int[] right) {
        int[] res = new int[left.length + right.length];
        int i = 0, j = 0, k = 0;
        while (i < left.length && j < right.length) {
            if (left[i] <= right[j]) res[k++] = left[i++];
            else res[k++] = right[j++];
        }
        while (i < left.length) res[k++] = left[i++];
        while (j < right.length) res[k++] = right[j++];
        return res;
    }
}`,
    cpp: `#include <vector>
using namespace std;

vector<int> merge(vector<int> left, vector<int> right) {
    vector<int> res;
    int i = 0, j = 0;
    while (i < left.size() && j < right.size()) {
        if (left[i] <= right[j]) res.push_back(left[i++]);
        else res.push_back(right[j++]);
    }
    res.insert(res.end(), left.begin() + i, left.end());
    res.insert(res.end(), right.begin() + j, right.end());
    return res;
}

vector<int> mergeSort(vector<int> arr) {
    if (arr.size() <= 1) return arr;
    int mid = arr.size() / 2;
    vector<int> left(arr.begin(), arr.begin() + mid);
    vector<int> right(arr.begin() + mid, arr.end());
    return merge(mergeSort(left), mergeSort(right));
}`,
    go: `func mergeSort(arr []int) []int {
    if len(arr) <= 1 {
        return arr
    }
    mid := len(arr) / 2
    left := mergeSort(append([]int{}, arr[:mid]...))
    right := mergeSort(append([]int{}, arr[mid:]...))
    return merge(left, right)
}

func merge(left, right []int) []int {
    res := []int{}
    i, j := 0, 0
    for i < len(left) && j < len(right) {
        if left[i] <= right[j] {
            res = append(res, left[i])
            i++
        } else {
            res = append(res, right[j])
            j++
        }
    }
    res = append(res, left[i:]...)
    res = append(res, right[j:]...)
    return res
}`,
  },
  "heap-sort": {
    javascript: `function heapSort(arr) {
  const n = arr.length;
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) heapify(arr, n, i);
  for (let i = n - 1; i > 0; i--) {
    [arr[0], arr[i]] = [arr[i], arr[0]];
    heapify(arr, i, 0);
  }
  return arr;
}
function heapify(arr, n, i) {
  let largest = i;
  const l = 2 * i + 1, r = 2 * i + 2;
  if (l < n && arr[l] > arr[largest]) largest = l;
  if (r < n && arr[r] > arr[largest]) largest = r;
  if (largest !== i) { [arr[i], arr[largest]] = [arr[largest], arr[i]]; heapify(arr, n, largest); }
}`,
    python: `def heapify(arr, n, i):
    largest = i
    left, right = 2 * i + 1, 2 * i + 2
    if left < n and arr[left] > arr[largest]:
        largest = left
    if right < n and arr[right] > arr[largest]:
        largest = right
    if largest != i:
        arr[i], arr[largest] = arr[largest], arr[i]
        heapify(arr, n, largest)

def heap_sort(arr):
    n = len(arr)
    for i in range(n // 2 - 1, -1, -1):
        heapify(arr, n, i)
    for i in range(n - 1, 0, -1):
        arr[i], arr[0] = arr[0], arr[i]
        heapify(arr, i, 0)
    return arr`,
    java: `public class Solution {
    public static int[] heapSort(int[] arr) {
        int n = arr.length;
        for (int i = n / 2 - 1; i >= 0; i--) heapify(arr, n, i);
        for (int i = n - 1; i > 0; i--) {
            int t = arr[0]; arr[0] = arr[i]; arr[i] = t;
            heapify(arr, i, 0);
        }
        return arr;
    }
    private static void heapify(int[] arr, int n, int i) {
        int largest = i, l = 2 * i + 1, r = 2 * i + 2;
        if (l < n && arr[l] > arr[largest]) largest = l;
        if (r < n && arr[r] > arr[largest]) largest = r;
        if (largest != i) { int t = arr[i]; arr[i] = arr[largest]; arr[largest] = t; heapify(arr, n, largest); }
    }
}`,
    cpp: `#include <vector>
using namespace std;

void heapify(vector<int>& arr, int n, int i) {
    int largest = i, l = 2 * i + 1, r = 2 * i + 2;
    if (l < n && arr[l] > arr[largest]) largest = l;
    if (r < n && arr[r] > arr[largest]) largest = r;
    if (largest != i) { swap(arr[i], arr[largest]); heapify(arr, n, largest); }
}

vector<int> heapSort(vector<int> arr) {
    int n = arr.size();
    for (int i = n / 2 - 1; i >= 0; i--) heapify(arr, n, i);
    for (int i = n - 1; i > 0; i--) { swap(arr[0], arr[i]); heapify(arr, i, 0); }
    return arr;
}`,
    go: `func heapify(arr []int, n, i int) {
    largest := i
    l, r := 2*i+1, 2*i+2
    if l < n && arr[l] > arr[largest] {
        largest = l
    }
    if r < n && arr[r] > arr[largest] {
        largest = r
    }
    if largest != i {
        arr[i], arr[largest] = arr[largest], arr[i]
        heapify(arr, n, largest)
    }
}

func heapSort(arr []int) []int {
    n := len(arr)
    for i := n/2 - 1; i >= 0; i-- {
        heapify(arr, n, i)
    }
    for i := n - 1; i > 0; i-- {
        arr[0], arr[i] = arr[i], arr[0]
        heapify(arr, i, 0)
    }
    return arr
}`,
  },
  "stack": {
    javascript: `class Stack {
  constructor() { this.items = []; }
  push(x) { this.items.push(x); }
  pop() { return this.items.pop(); }
  peek() { return this.items[this.items.length - 1]; }
  isEmpty() { return this.items.length === 0; }
  get size() { return this.items.length; }
}`,
    python: `class Stack:
    def __init__(self):
        self.items = []
    def push(self, x):
        self.items.append(x)
    def pop(self):
        return self.items.pop()
    def peek(self):
        return self.items[-1]
    def is_empty(self):
        return len(self.items) == 0`,
    java: `import java.util.*;
public class Stack<T> {
    private ArrayList<T> items = new ArrayList<>();
    public void push(T x) { items.add(x); }
    public T pop() { return items.remove(items.size() - 1); }
    public T peek() { return items.get(items.size() - 1); }
    public boolean isEmpty() { return items.isEmpty(); }
}`,
    cpp: `#include <stack>
using namespace std;
// C++ has std::stack already
// std::stack<int> s;
// s.push(10); s.pop(); s.top(); s.empty();`,
    go: `type Stack struct {
    items []int
}

func (s *Stack) Push(x int) {
    s.items = append(s.items, x)
}

func (s *Stack) Pop() int {
    if len(s.items) == 0 { return -1 }
    x := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return x
}

func (s *Stack) Peek() int {
    if len(s.items) == 0 { return -1 }
    return s.items[len(s.items)-1]
}

func (s *Stack) IsEmpty() bool {
    return len(s.items) == 0
}`,
  },
  "queue": {
    javascript: `class Queue {
  constructor() { this.items = {}; this.head = 0; this.tail = 0; }
  enqueue(x) { this.items[this.tail++] = x; }
  dequeue() {
    if (this.isEmpty()) return null;
    const x = this.items[this.head];
    delete this.items[this.head++];
    return x;
  }
  front() { return this.items[this.head]; }
  isEmpty() { return this.head === this.tail; }
  get size() { return this.tail - this.head; }
}`,
    python: `from collections import deque

class Queue:
    def __init__(self):
        self.items = deque()
    def enqueue(self, x):
        self.items.append(x)
    def dequeue(self):
        return self.items.popleft()
    def front(self):
        return self.items[0]
    def is_empty(self):
        return len(self.items) == 0`,
    java: `import java.util.*;
public class Queue<T> {
    private LinkedList<T> list = new LinkedList<>();
    public void enqueue(T x) { list.addLast(x); }
    public T dequeue() { return list.pollFirst(); }
    public T front() { return list.peekFirst(); }
    public boolean isEmpty() { return list.isEmpty(); }
}`,
    cpp: `#include <queue>
using namespace std;
// C++ has std::queue already
// std::queue<int> q;
// q.push(10); q.pop(); q.front(); q.empty();`,
    go: `type Queue struct {
    items []int
}

func (q *Queue) Enqueue(x int) {
    q.items = append(q.items, x)
}

func (q *Queue) Dequeue() int {
    if len(q.items) == 0 { return -1 }
    x := q.items[0]
    q.items = q.items[1:]
    return x
}

func (q *Queue) Front() int {
    if len(q.items) == 0 { return -1 }
    return q.items[0]
}

func (q *Queue) IsEmpty() bool {
    return len(q.items) == 0
}`,
  },
};

export function getTemplate(algorithmSlug: string, language: SupportedLanguage): string {
  const algoTemplates = templates[algorithmSlug];
  if (!algoTemplates) return "";
  return algoTemplates[language] ?? "";
}

export function getPistonLanguage(lang: SupportedLanguage): string {
  return lang === "cpp" ? "c++" : lang;
}

export function getDefaultTestInput(algorithmSlug: string): unknown[] {
  if (algorithmSlug === "binary-search") return [[1, 3, 5, 7, 9, 11, 13], 7];
  return [[5, 2, 8, 1, 9, 3]];
}

export function getExpectedOutput(algorithmSlug: string): string {
  if (algorithmSlug === "binary-search") return "3";
  return JSON.stringify([1, 2, 3, 5, 8, 9]);
}
