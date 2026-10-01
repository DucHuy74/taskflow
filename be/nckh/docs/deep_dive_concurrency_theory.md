# Deep Dive: Concurrency, Deadlock & Database Performance

> **Mục tiêu:** Tài liệu lý thuyết cực chi tiết + hướng dẫn thực hiện cho các phase 2-6.
> **Giả định:** MySQL 8.0 + InnoDB, Java Spring Boot, Python FastAPI, Redis, RabbitMQ.

---

## Mục lục

1. [Concurrency Fundamentals — Lý thuyết nền tảng](#1-concurrency-fundamentals--lý-thuyết-nền-tảng)
2. [Deadlock — Tầng Database (MySQL InnoDB)](#2-deadlock--tầng-database-mysql-innodb)
3. [Deadlock — Tầng Application (Java Multithread)](#3-deadlock--tầng-application-java-multithread)
4. [Race Conditions & Lost Updates](#4-race-conditions--lost-updates)
5. [Optimistic Locking vs Pessimistic Locking](#5-optimistic-locking-vs-pessimistic-locking)
6. [N+1 Query Problem](#6-n1-query-problem)
7. [API Response Time Optimization](#7-api-response-time-optimization)
8. [Distributed Locking (Redis)](#8-distributed-locking-redis)
9. [Concurrency Patterns trong Java](#9-concurrency-patterns-trong-java)
10. [Single Flight Pattern](#10-single-flight-pattern)
11. [Transaction Isolation Levels](#11-transaction-isolation-levels)
12. [Read Replica & Write Separation](#12-read-replica--write-separation)
13. [Hands-on Labs](#13-hands-on-labs)

---

# 1. Concurrency Fundamentals — Lý thuyết nền tảng

## 1.1 Định nghĩa

**Concurrency (đồng thời):** Nhiều tác vụ bắt đầu/chạy trong cùng khoảng thời gian, nhưng không nhất thiết cùng lúc trên CPU (do context switching).

**Parallelism (song song):** Nhiều tác vụ thực sự chạy cùng lúc trên nhiều CPU core.

```
Concurrency (1 core):     Timeline →
    Task A: |████|     |██|
    Task B:     |██|     |████|

Parallelism (2 cores):    Timeline →
    Core 1: |████████|
    Core 2: |████|
```

## 1.2 Tại sao concurrency gây vấn đề?

Khi nhiều task truy cập **shared resources** (database rows, memory, files), thứ tự thực thi không đoán trước được → **data inconsistency**.

### Shared Resource Example

```java
// Giả sử balance = 1000
// User A: rút 500
// User B: rút 300
// Kết quả đúng: 1000 - 500 - 300 = 200

// Race condition:
read balance = 1000          // A đọc
                               // B đọc → cũng 1000
calculate 1000 - 500 = 500    // A tính
calculate 1000 - 300 = 700    // B tính
write balance = 500            // A ghi
write balance = 700           // B ghi → Final: 700 ❌
                               // Đúng phải là: 200
```

## 1.3 Memory Model trong Java

Java Memory Model (JMM) định nghĩa cách threads nhìn thấy dữ liệu của nhau.

### Key Concepts:

| Khái niệm | Giải thích |
|-----------|------------|
| **Visibility** | Thread A thay đổi biến → Thread B có thể không thấy ngay |
| **Ordering** | Compiler/CPU có thể reorder câu lệnh để tối ưu |
| **Atomicity** | Một operation "nguyên tử" không bị interrupt |

### Visibility Problem:

```java
public class VisibilityProblem {
    private boolean flag = false;
    private int counter = 0;

    // Thread A
    public void writer() {
        counter = 42;      // W1
        flag = true;       // W2
    }

    // Thread B
    public void reader() {
        if (flag) {        // Có thể không thấy counter = 42!
            System.out.println(counter);  // Có thể in 0!
        }
    }
}
```

**Tại sao?** CPU cache → writes có thể chưa visible sang cores khác.

### Happens-Before Guarantee:

Để đảm bảo visibility, cần **happens-before relationship**:

```java
// happens-before: write → read cùng biến
// 1. Lock (synchronized, ReentrantLock)
// 2. Volatile read/write
// 3. Thread.start()
// 4. Thread.join()
// 5. Atomic operations
```

## 1.4 Java Synchronization Primitives

### 1.4.1 `synchronized`

```java
// Intrinsic lock (monitor) trên object
public synchronized void withdraw(int amount) {
    if (balance >= amount) {
        balance -= amount;
    }
}

// Equivalent bytecode:
// 1. Acquire monitor lock
// 2. Execute method body
// 3. Release monitor lock (even on exception)
```

**Đặc điểm:**
- **Reentrant:** Cùng thread có thể acquire lock nhiều lần (đếm)
- **Blocking:** Thread block nếu lock đang held
- **Memory barrier:** Đảm bảo happens-before

### 1.4.2 `ReentrantLock`

```java
private final ReentrantLock lock = new ReentrantLock();

public void withdraw(int amount) {
    lock.lock();
    try {
        if (balance >= amount) {
            balance -= amount;
        }
    } finally {
        lock.unlock();  // Must be in finally!
    }
}
```

**Ưu điểm so với synchronized:**
- `tryLock()` — non-blocking attempt
- `tryLock(timeout, TimeUnit)` — có thời gian chờ
- `lockInterruptibly()` — có thể interrupt
- `newCondition()` — nhiều condition variables
- Có thể fairness policy

### 1.4.3 `volatile`

```java
private volatile boolean flag = false;
```

**Đảm bảo:**
- **Visibility:** Writes luôn visible cho reads (no CPU cache)
- **Ordering:** Reads/writes không reorder với nhau

**KHÔNG đảm bảo:** Atomicity cho compound actions (e.g., `count++`)

### 1.4.4 Atomic Classes (`java.util.concurrent.atomic`)

```java
private AtomicInteger balance = new AtomicInteger(1000);

public void withdraw(int amount) {
    // Atomic: read-modify-write
    balance.updateAndGet(current -> 
        current >= amount ? current - amount : current
    );
}

// Hoặc compare-and-swap loop:
public void withdrawCAS(int amount) {
    while (true) {
        int current = balance.get();
        if (current >= amount) {
            if (balance.compareAndSet(current, current - amount)) {
                return;
            }
            // Retry nếu concurrent update
        }
    }
}
```

## 1.5 Race Condition

**Race condition:** Kết quả phụ thuộc vào timing của concurrent events.

### Types:

| Type | Mô tả | Ví dụ |
|------|-------|-------|
| **Read-Modify-Write** | Đọc → Tính → Ghi không atomic | `count++` |
| **Check-Then-Act** | Kiểm tra rồi hành động, giữa chừng state thay đổi | `if (exists) create()` |
| **Lost Update** | 2 updates cùng đọc original, 1 bị ghi đè | Phase 5 |
| **Deadlock** | 2+ threads chờ nhau forever | Phase 2 |

---

# 2. Deadlock — Tầng Database (MySQL InnoDB)

## 2.1 Deadlock là gì?

**Deadlock:** Tình trạng 2+ transactions chờ nhau giải phóng locks mà mỗi transaction đang giữ, không transaction nào có thể tiếp tục.

```
Transaction A                    Transaction B
───────────                     ───────────
LOCK row_1 ✓                    LOCK row_2 ✓
WAIT row_2 (A đợi B)            WAIT row_1 (B đợi A)
     ↓                               ↓
     └──────────── DEADLOCK ──────────┘
```

## 2.2 InnoDB Lock Types

### 2.2.1 Row-Level Locks

| Lock Mode | Mục đích | Tương thích |
|-----------|----------|-------------|
| `LOCK_X` (Exclusive) | Write (UPDATE, DELETE, INSERT) | Chặn mọi lock khác |
| `LOCK_S` (Shared) | Read lock | Cho phép shared, chặn exclusive |

```sql
-- Shared lock (auto added by SELECT)
SELECT * FROM user_story WHERE id = 1 LOCK IN SHARE MODE;

-- Exclusive lock (auto added by UPDATE/DELETE)
UPDATE user_story SET status = 'done' WHERE id = 1;
```

### 2.2.2 Gap Locks & Next-Key Locks

```sql
-- InnoDB locks cả range, không chỉ row
SELECT * FROM user_story WHERE id BETWEEN 10 AND 20;
-- Locks: [10, 20] (cả gap giữa các rows)
```

**Tại sao?** Để prevent **phantom reads** — khi another transaction insert row mới vào range đang lock.

### 2.2.3 Index Locks

**QUAN TRỌNG:** InnoDB locks rows thông qua **index entries**!

```sql
UPDATE user_story SET status = 'done' WHERE workspace_id = 1;
-- Nếu có index trên workspace_id:
-- Locks ALL rows có workspace_id = 1 (qua index)
-- Nếu không có index:
-- Full table scan → locks TẤT CẢ rows!
```

## 2.3 How InnoDB Detects Deadlocks

```sql
-- Xem deadlock gần nhất
SHOW ENGINE INNODB STATUS\G

-- Output mẫu:
************************* 1. row *************************
  Type: InnoDB
  Status:
INNODB MONITOR OUTPUT
------------------------
LATEST DETECTED DEADLOCK
------------------------
*** (1) TRANSACTION:
TRANSACTION 12345, ACTIVE 5 sec updating
SQL: UPDATE user_story SET spr_id=5 WHERE us_id=3
*** (1) HOLDS THE LOCK(S):
LOCK WAIT: 3 lock struct(s), heap size 1136
--- TRANSACTION 1 holds gap lock on index us_id
*** (1) WAITING FOR THIS LOCK TO BE GRANTED:
LOCK: RECORD LOCK on index us_id of table nckh.user_story
*** (2) TRANSACTION:
TRANSACTION 12346, ACTIVE 3 sec updating
SQL: UPDATE user_story SET spr_id=5 WHERE us_id=5
*** (2) HOLDS THE LOCK(S):
LOCK: RECORD LOCK on index us_id of table nckh.user_story
*** (2) WAITING FOR THIS LOCK TO BE GRANTED:
LOCK: RECORD LOCK on index us_id of table nckh.user_story
--- WE ROLL BACK TRANSACTION (1)
```

## 2.4 Scenario Deadlock trong Project

### Scenario A: Bulk Sprint Assignment

```java
// SprintAppServiceImpl.addUserStoriesToSprint()

// Transaction A: User A assign [1, 2, 3]
// Transaction B: User B assign [3, 2, 1]  ← thứ tự ngược!

@Transactional
public void addUserStoriesToSprint(Long sprintId, List<Long> storyIds) {
    Sprint sprint = sprintRepository.findById(sprintId);
    
    for (Long storyId : storyIds) {  // Thứ tự: 1, 2, 3
        UserStory story = userStoryRepository.findById(storyId);
        story.setSprint(sprint);
        userStoryRepository.save(story);  // UPDATE user_story
    }
}
```

**Tại sao deadlock?**

```
Timeline:
─────────────────────────────────────────────────────────────
T_A: UPDATE us_id=1 (acquire X-lock on row 1)
T_B: UPDATE us_id=3 (acquire X-lock on row 3)
T_A: UPDATE us_id=2 (waiting for row 2...)
      ↑
      └─ T_B đang giữ lock trên row 2 (khi update row 3 → index scan → lock row 2)
T_B: UPDATE us_id=2 (waiting for row 2...)
      ↑
      └─ T_A đang giữ lock trên row 2 (khi update row 1 → index scan → lock row 2)
─────────────────────────────────────────────────────────────
DEADLOCK! InnoDB rollback một transaction.
```

### Scenario B: Unordered Loop với Related Entities

```java
// startSprint() — thay đổi sprint status + move stories
@Transactional
public void startSprint(Long sprintId) {
    Sprint sprint = sprintRepository.findById(sprintId);
    sprint.setStatus("ACTIVE");
    
    List<UserStory> stories = userStoryRepository.findBySprintId(sprintId);
    
    for (UserStory story : stories) {  // Không deterministic!
        story.setStatus("IN_PROGRESS");
    }
}
```

## 2.5 Lock Ordering — Giải pháp

**Nguyên tắc vàng:** Luôn acquire locks theo **cùng thứ tự** bất kể transaction nào.

```java
@Transactional
public void addUserStoriesToSprint(Long sprintId, List<Long> storyIds) {
    Sprint sprint = sprintRepository.findById(sprintId);
    
    // ✅ FIX: Sort trước khi loop
    List<Long> sortedIds = storyIds.stream()
        .sorted()  // Hoặc TreeSet
        .collect(Collectors.toList());
    
    for (Long storyId : sortedIds) {
        UserStory story = userStoryRepository.findById(storyId);
        story.setSprint(sprint);
        userStoryRepository.save(story);
    }
}
```

### So sánh:

```java
// ❌ WRONG: HashSet/HashMap không guarantee order
Set<Long> storyIds = new HashSet<>(ids);

// ✅ CORRECT: TreeSet guarantee ascending order
Set<Long> storyIds = new TreeSet<>(ids);

// ✅ CORRECT: Sort list
List<Long> sortedIds = ids.stream().sorted().toList();
```

## 2.6 Detecting Deadlock in Application (Spring)

```java
// Global Exception Handler
@ExceptionHandler(PessimisticLockingFailureException.class)
public ResponseEntity<?> handleDeadlock(PessimisticLockingFailureException ex) {
    // MySQL error 1213 = deadlock
    if (ex.getMessage().contains("Deadlock")) {
        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(Map.of(
                "error", "DEADLOCK_DETECTED",
                "message", "Please retry your request"
            ));
    }
    throw ex;
}
```

### Spring Data JPA Lock Exceptions:

```java
// PessimisticLockingFailureException
//   └─ CannotAcquireLockException (MySQL 1205)
//   └─ CannotSerializeTransactionException (MySQL 1213 = deadlock)

// Cách check:
PessimisticLockingFailureException ex;
if (ex.getMessage().contains("1213")) {
    // Deadlock
} else if (ex.getMessage().contains("1205")) {
    // Lock wait timeout
}
```

## 2.7 Retry Strategy

```java
@Service
@RequiredArgsConstructor
public class DeadlockRetryHandler {
    
    private static final int MAX_RETRIES = 3;
    private static final long INITIAL_DELAY_MS = 100;
    
    @Retryable(
        value = {PessimisticLockingFailureException.class},
        maxAttempts = MAX_RETRIES,
        backoff = @Backoff(delay = INITIAL_DELAY_MS, multiplier = 2)
    )
    public void addStoriesToSprint(Long sprintId, List<Long> storyIds) {
        // Business logic
    }
}
```

### Manual Retry Implementation:

```java
public <T> T executeWithRetry(Supplier<T> action, int maxRetries) {
    int attempt = 0;
    while (true) {
        try {
            return action.get();
        } catch (PessimisticLockingFailureException ex) {
            attempt++;
            if (attempt >= maxRetries) {
                throw ex;
            }
            // Exponential backoff: 100ms, 200ms, 400ms...
            long delay = INITIAL_DELAY_MS * (1L << (attempt - 1));
            Thread.sleep(delay);
        }
    }
}
```

## 2.8 InnoDB Deadlock Prevention Settings

```sql
-- Tăng lock wait timeout (default 50s)
SET GLOBAL innodb_lock_wait_timeout = 120;

-- Bật deadlock logging
SET GLOBAL innodb_print_all_deadlocks = ON;

-- Kiểm tra deadlock log
SHOW ENGINE INNODB STATUS;
```

### my.cnf / Docker:

```yaml
mysql-master:
  image: mysql:8.0
  command: >
    --innodb-lock-wait-timeout=120
    --innodb-print-all-deadlocks=ON
    --innodb-deadlock-detect=ON
```

---

# 3. Deadlock — Tầng Application (Java Multithread)

## 3.1 App-Level Deadlock là gì?

Deadlock ở tầng application xảy ra khi **threads chờ nhau** giải phóng locks (không phải database locks).

## 3.2 4 Điều kiện Cần thiết (Coffman Conditions)

Deadlock xảy ra khi **TẤT CẢ** 4 điều kiện đồng thời:

| Điều kiện | Giải thích |
|-----------|-------------|
| **1. Mutual Exclusion** | Resource chỉ 1 thread dùng tại 1 thời điểm |
| **2. Hold and Wait** | Thread giữ resource và chờ resource khác |
| **3. No Preemption** | Resource không bị forcibly taken |
| **4. Circular Wait** | Thread chain chờ nhau vòng tròn |

**Để prevent deadlock:** Phá vỡ **ÍT NHẤT 1** điều kiện.

## 3.3 Common App Deadlock Scenarios

### 3.3.1 Nested Synchronized Locks (Reversed Order)

```java
public class TransferService {
    
    public synchronized void transfer(Account from, Account to, int amount) {
        // Lock 'from' first
        synchronized (to) {
            from.withdraw(amount);
            to.deposit(amount);
        }
    }
    
    // ⚠️ Cùng class, nhưng có thể gọi ngược:
    // Thread A: transfer(ACC1, ACC2)
    // Thread B: transfer(ACC2, ACC1)
    // → DEADLOCK!
}
```

**Timeline:**
```
T_A: synchronized(this) on ACC1 → acquired
T_B: synchronized(this) on ACC2 → acquired
T_A: try synchronized(ACC2) → BLOCKED (T_B holding)
T_B: try synchronized(ACC1) → BLOCKED (T_A holding)
→ DEADLOCK!
```

**Fix — Lock Ordering:**

```java
public class TransferService {
    
    public void transfer(Account from, Account to, int amount) {
        // ✅ Luôn lock theo ID order
        Account first = from.getId() < to.getId() ? from : to;
        Account second = from.getId() < to.getId() ? to : from;
        
        synchronized (first) {
            synchronized (second) {
                from.withdraw(amount);
                to.deposit(amount);
            }
        }
    }
}
```

### 3.3.2 Database Lock + Application Lock

```java
@Service
@RequiredArgsConstructor
public class SprintService {
    
    private final ObjectMapper objectMapper;  // Shared resource?
    
    @Transactional
    public void processStory(Long storyId) {
        UserStory story = repository.findByIdWithLock(storyId);
        // Row lock on DB
        
        synchronized (this) {  // ⚠️ Có thể deadlock!
            // Xử lý...
        }
    }
}

// Thread A: holds DB lock on row 1, waiting to acquire this(this)
// Thread B: holds this(this), waiting for DB lock on row 1
```

**Fix — Không mix locks:**

```java
// Option 1: Không dùng synchronized trong @Transactional
@Transactional
public void processStory(Long storyId) {
    // Xử lý không blocking, để DB handle concurrency
}

// Option 2: Dùng lock ở tầng khác
public void processStory(Long storyId) {
    // Validate business rules outside transaction
    // Chỉ lock khi thực sự cần
}
```

### 3.3.3 Thread Pool Starvation Deadlock

```java
public class AsyncService {
    
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    
    public CompletableFuture<String> outerTask() {
        return CompletableFuture.supplyAsync(() -> {
            // Task A: gọi innerTask() trong cùng single-thread executor
            return innerTask().join();  // ⚠️ DEADLOCK!
        }, executor);
    }
    
    public CompletableFuture<String> innerTask() {
        return CompletableFuture.supplyAsync(() -> {
            return "result";
        }, executor);  // Cùng executor → không có thread rảnh!
    }
}
```

**Fix:**

```java
// Option 1: Khác executor
private final ExecutorService executor = 
    Executors.newFixedThreadPool(2);

// Option 2: Dùng different executor cho nested calls
public CompletableFuture<String> innerTask() {
    return CompletableFuture.supplyAsync(() -> "result", 
        commonPool);  // ForkJoinPool common
}
```

### 3.3.4 ReentrantLock Ordering Deadlock

```java
public class MultiLockService {
    
    private final ReentrantLock lockA = new ReentrantLock();
    private final ReentrantLock lockB = new ReentrantLock();
    
    public void method1() {
        lockA.lock();
        try {
            // ...
            lockB.lock();  // Acquire B
            try {
                // ...
            } finally {
                lockB.unlock();
            }
        } finally {
            lockA.unlock();
        }
    }
    
    public void method2() {
        lockB.lock();
        try {
            // ...
            lockA.lock();  // ⚠️ Ngược thứ tự!
            try {
                // ...
            } finally {
                lockA.unlock();
            }
        } finally {
            lockB.unlock();
        }
    }
}
```

**Fix:**

```java
// ✅ Dùng lock ordering
private static final ReentrantLock[] ORDERED_LOCKS = 
    new ReentrantLock[] { lockA, lockB };

public void method2() {
    // Lock trong thứ tự cố định
    lock(lockA);
    try {
        lock(lockB);
        try {
            // ...
        } finally {
            lockB.unlock();
        }
    } finally {
        lockA.unlock();
    }
}
```

## 3.4 Livelock

**Livelock:** Threads không bị blocked nhưng không progress (liên tục respond to each other).

```java
// Ví dụ: 2 người cùng nhường đường
PersonA: step left, step left, step left...
PersonB: step right, step right, step right...

// → Cùng ở vị trí, không ai progress
```

### Solution:

```java
// Random backoff khi conflict
Random random = new Random();
int delay = random.nextInt(100);  // 0-99ms
Thread.sleep(delay);
```

## 3.5 Thread Starvation

**Starvation:** Thread không bao giờ được CPU time vì bị others chiếm resource.

```java
// Unfair lock → có thể starve
ReentrantLock unfair = new ReentrantLock();

// Fair lock → đảm bảo FIFO (nhưng chậm hơn)
ReentrantLock fair = new ReentrantLock(true);
```

## 3.6 Tools để Debug Deadlock

### 3.6.1 jstack (JDK)

```bash
# PID của Java process
jstack -l <pid> > thread_dump.txt

# Output mẫu (deadlock section):
Found one Java-level deadlock:
=========================
"pool-1-thread-2":
  waiting for ownable synchronizer 0x00007f8a5c01e3a0, 
    (a java.util.concurrent.locks.ReentrantLock$NonfairSync),
  which is held by "pool-1-thread-1"
"pool-1-thread-1":
  waiting for ownable synchronizer 0x00007f8a5c01e390,
    (a java.util.concurrent.locks.ReentrantLock$NonfairSync),
  which is held by "pool-1-thread-2"
```

### 3.6.2 VisualVM

```bash
# Start jstatd (remote monitoring)
jstatd -J-Djava.security.policy=jstatd.policy

# Connect via VisualVM
```

### 3.6.3 IntelliJ IDEA

- **Thread Dump:** Run → Thread Dump
- **Deadlock Detection:** Automatically highlighted in thread pane

---

# 4. Race Conditions & Lost Updates

## 4.1 Lost Update Problem

**Lost Update:** 2 concurrent transactions đọc cùng data, mỗi transaction tính toán và ghi, kết quả của transaction đầu tiên bị "mất".

```
T1: READ balance = 1000
T2: READ balance = 1000
T1: WRITE balance = 1000 - 500 = 500
T2: WRITE balance = 1000 - 300 = 700  ← T1's update bị LOST!
Final: 700 (Expected: 200)
```

## 4.2 Dirty Read vs Non-Repeatable Read vs Phantom Read

| Phenomenon | Mô tả | Isolation Level |
|------------|-------|----------------|
| **Dirty Read** | Đọc uncommitted data của transaction khác | Read Uncommitted |
| **Non-Repeatable Read** | Re-read same row → different value (vì update/delete) | Read Committed |
| **Phantom Read** | Re-execute query → different rows (vì insert/delete) | Read Committed |

## 4.3 Isolation Levels & Lost Update

```sql
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Transaction 1
START TRANSACTION;
SELECT balance FROM account WHERE id = 1;  -- 1000
-- (Tính toán: 1000 - 500)
UPDATE account SET balance = 500 WHERE id = 1;
COMMIT;

-- Transaction 2 (concurrent)
START TRANSACTION;
SELECT balance FROM account WHERE id = 1;  -- 1000 (nếu T1 chưa commit)
-- (Tính toán: 1000 - 300)
UPDATE account SET balance = 700 WHERE id = 1;  -- ❌ LOST UPDATE!
COMMIT;
```

---

# 5. Optimistic Locking vs Pessimistic Locking

## 5.1 Pessimistic Locking

**Nguyên tắc:** "Lock trước, ask later" — Giữ lock suốt transaction.

```sql
-- Pessimistic Read
SELECT * FROM user_story WHERE id = 1 FOR UPDATE;

-- Pessimistic Write
UPDATE user_story SET status = 'done' WHERE id = 1;
-- (Auto acquires X-lock)
```

### Java Implementation:

```java
// Spring Data JPA
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT s FROM UserStory s WHERE s.id = :id")
Optional<UserStory> findByIdForUpdate(@Param("id") Long id);
```

### Pros/Cons:

| Pros | Cons |
|------|------|
| Đảm bảo consistency tuyệt đối | Performance chậm (lock held lâu) |
| Đơn giản, predictable | Tăng deadlock risk |
| Tốt cho high contention | Block readers khác |

## 5.2 Optimistic Locking

**Nguyên tắc:** "Lock không, check version khi write" — Không lock, nhưng verify không conflict.

### Implementation:

```java
// Entity
@Entity
@Table(name = "user_story")
public class UserStory {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // ...
    
    @Version
    private Long version;  // Auto managed by JPA
}
```

### SQL Generated:

```sql
-- UPDATE với version check
UPDATE user_story 
SET status = 'done', version = version + 1 
WHERE id = ? AND version = ?;

-- Nếu rows_affected = 0 → OptimisticLockException
```

### Exception Handling:

```java
@ExceptionHandler(OptimisticLockException.class)
public ResponseEntity<?> handleOptimisticLock(OptimisticLockException ex) {
    return ResponseEntity
        .status(HttpStatus.CONFLICT)  // 409
        .body(Map.of(
            "error", "VERSION_CONFLICT",
            "message", "Data has been modified. Please refresh and retry."
        ));
}
```

### Client-side Implementation:

```javascript
// Frontend: Gửi version cùng request
PUT /api/stories/1
{
    "status": "done",
    "expectedVersion": 5  // Version client đã đọc
}

// Backend: Verify
UserStory story = repository.findById(id);
if (!story.getVersion().equals(expectedVersion)) {
    throw new VersionConflictException();
}
```

## 5.3 So sánh Chi tiết

| Aspect | Pessimistic | Optimistic |
|--------|-------------|------------|
| **Lock timing** | Early (at read) | Late (at write) |
| **Conflict detection** | Prevent conflicts | Detect conflicts |
| **Performance (low contention)** | Worse (lock overhead) | Better |
| **Performance (high contention)** | Better (serializes) | Worse (retries) |
| **User experience** | Smooth (no errors) | Must handle 409 |
| **Suitable for** | Financial, inventory | User content, preferences |

### Khi nào dùng?

```
┌─────────────────────────────────────────────────────────┐
│                    PESSIMISTIC LOCK                     │
│   • High contention, many conflicts expected             │
│   • Must serialize access (inventory, balances)          │
│   • Short transactions                                    │
│   • User expects success, not retry                      │
├─────────────────────────────────────────────────────────┤
│                    OPTIMISTIC LOCK                       │
│   • Low contention, conflicts rare                      │
│   • Long transactions, many users                         │
│   • Low impact of conflict (can retry)                   │
│   • User can handle refresh (like Google Docs)           │
└─────────────────────────────────────────────────────────┘
```

## 5.4 Hybrid Approach

```java
public void updateStory(Long id, StoryUpdate update) {
    // 1. Read với version
    UserStory story = repository.findById(id);
    
    // 2. Quick optimistic check
    if (!story.getVersion().equals(update.getExpectedVersion())) {
        throw new ConflictException();
    }
    
    // 3. Pessimistic lock khi confirm update
    story = repository.findByIdForUpdate(id);
    
    // 4. Verify lại
    if (!story.getVersion().equals(update.getExpectedVersion())) {
        throw new ConflictException();
    }
    
    // 5. Update
    story.setStatus(update.getStatus());
    repository.save(story);
}
```

---

# 6. N+1 Query Problem

## 6.1 Problem Definition

**N+1 Query:** 1 query để fetch parent + N queries để fetch each child.

```sql
-- Query 1: Fetch 50 stories
SELECT * FROM user_story WHERE workspace_id = 1;

-- Query 2-51: Fetch sprint cho mỗi story
SELECT * FROM sprint WHERE id = 1;
SELECT * FROM sprint WHERE id = 2;
...
SELECT * FROM sprint WHERE id = 50;
```

**Total: 51 queries cho 50 rows!**

## 6.2 How Hibernate N+1 Happens

```java
// N+1 khi không eager fetch
@Entity
public class UserStory {
    @Id
    private Long id;
    
    @ManyToOne
    private Sprint sprint;  // Lazy by default!
}

// Service
List<UserStory> stories = repo.findByWorkspaceId(id);
for (UserStory story : stories) {
    Sprint sprint = story.getSprint();  // 💥 Lazy load → 1 query per iteration!
}
```

## 6.3 Solution: JOIN FETCH

```java
// ✅ Single query với JOIN
@Query("""
    SELECT s FROM UserStory s
    LEFT JOIN FETCH s.sprint
    LEFT JOIN FETCH s.workspace
    WHERE s.workspace.id = :workspaceId
""")
List<UserStory> findByWorkspaceIdWithRelations(@Param("workspaceId") Long workspaceId);
```

### SQL Generated:

```sql
-- 1 query duy nhất
SELECT s.*, sp.*, w.*
FROM user_story s
LEFT JOIN sprint sp ON s.spr_id = sp.id
LEFT JOIN workspace w ON s.wsp_id = w.id
WHERE s.wsp_id = ?
```

## 6.4 Multiple Levels (N+1+1)

```java
// ❌ Vẫn có N+1!
@Query("SELECT s FROM UserStory s JOIN FETCH s.sprint")
List<UserStory> findAll();

// ✅ Fetch all levels
@Query("""
    SELECT DISTINCT s FROM UserStory s
    LEFT JOIN FETCH s.sprint sp
    LEFT JOIN FETCH sp.workspace
    WHERE s.workspace.id = :workspaceId
""")
List<UserStory> findByWorkspaceId(@Param("workspaceId") Long workspaceId);
```

**Note:** `DISTINCT` để loại bỏ duplicate rows từ JOIN.

## 6.5 Entity Graph (JPA 2.1)

```java
// Define graph
@Entity
@NamedEntityGraph(
    name = "UserStory.withSprint",
    attributeNodes = @NamedAttributeNode("sprint")
)
public class UserStory {
    // ...
}

// Use graph
@EntityGraph(value = "UserStory.withSprint", type = EntityGraph.EntityGraphType.LOAD)
Optional<UserStory> findById(Long id);
```

## 6.6 Batch Fetching

```java
// application.yml
spring:
  jpa:
    properties:
      default_batch_fetch_size: 25  # IN (1,2,...,25) per batch
```

```java
// Hibernate fetch 25 story sprint cùng lúc
// SELECT * FROM sprint WHERE id IN (1,2,...,25)
```

## 6.7 Hibernate Statistics

```java
// Enable
spring.jpa.properties.hibernate.generate_statistics: true

// Log output
org.hibernate.SQL: DEBUG
org.hibernate.type.descriptor.sql.BasicBinder: TRACE
```

### Metrics Endpoint:

```yaml
management:
  endpoints:
    web.exposure.include: health,metrics
  metrics:
    enable:
      hibernate: true
```

```bash
# Query count
curl localhost:8080/actuator/metrics/hibernate.statements
```

---

# 7. API Response Time Optimization

## 7.1 Profiling First

### 7.1.1 Actuator + Micrometer

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

```yaml
management:
  endpoints:
    web.exposure.include: health,metrics,prometheus
  metrics:
    tags:
      application: nckh-api
```

### 7.1.2 k6 Script

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 10 },   // Ramp up
        { duration: '1m', target: 10 },    // Steady
        { duration: '30s', target: 0 },    // Ramp down
    ],
};

export default function() {
    const res = http.get('http://localhost:8080/api/backlog/workspace-1');
    check(res, {
        'status was 200': (r) => r.status == 200,
        'response time < 200ms': (r) => r.timings.duration < 200,
    });
    sleep(1);
}
```

```bash
k6 run load-test.js --out influxdb=http://localhost:8086
```

## 7.2 Database Indexes

### 7.2.1 Index Strategy

**Rule:** Chỉ index columns trong:
- `WHERE` clauses
- `JOIN` conditions
- `ORDER BY`

```sql
-- ✅ Good: Composite index cho query pattern
CREATE INDEX idx_story_workspace_sprint 
    ON user_story(wsp_id, spr_id);

-- Query: WHERE wsp_id = ? AND spr_id IS NULL
-- → Index scan!

-- ❌ Bad: Separate indexes
CREATE INDEX idx_story_workspace ON user_story(wsp_id);
CREATE INDEX idx_story_sprint ON user_story(spr_id);
-- → Index intersection (MySQL < 8.0 không tối ưu)
```

### 7.2.2 Index for Common Queries

```sql
-- List backlog: workspace + no sprint
CREATE INDEX idx_story_backlog 
    ON user_story(wsp_id, spr_id);

-- List sprint stories: sprint
CREATE INDEX idx_story_sprint 
    ON user_story(spr_id);

-- Workspace members
CREATE INDEX idx_member_workspace 
    ON workspace_member(wsp_id);

-- Sprints by workspace
CREATE INDEX idx_sprint_workspace 
    ON sprint(wsp_id);
```

### 7.2.3 EXPLAIN Analysis

```sql
EXPLAIN SELECT s.* FROM user_story s 
WHERE s.wsp_id = 1 AND s.spr_id IS NULL;

-- Before index:
-- type: ALL (full table scan)
-- rows: 10000

-- After index:
-- type: ref (index lookup)
-- key: idx_story_backlog
-- rows: 50
```

## 7.3 Connection Pool (HikariCP)

```yaml
spring:
  datasource:
    hikari:
      # Pool size: CPU cores * 2 (for I/O bound: + network factor)
      maximum-pool-size: 20
      
      # Thời gian chờ connection
      connection-timeout: 30000  # 30s
      
      # Idle connections
      minimum-idle: 5
      
      # Phát hiện connection leak (dev only)
      leak-detection-threshold: 60000  # 60s
      
      # Keepalive
      keepalive-time: 300000  # 5min
      
      # Max lifetime
      max-lifetime: 1800000  # 30min
```

### Monitoring:

```bash
# Hikari metrics
curl localhost:8080/actuator/metrics/hikaricp.connections.active
curl localhost:8080/actuator/metrics/hikaricp.connections.idle
curl localhost:8080/actuator/metrics/hikaricp.connections.pending
curl localhost:8080/actuator/metrics/hikaricp.connections.timeout
```

## 7.4 Pagination

```java
// ❌ Load all
List<UserStory> stories = repo.findByWorkspaceId(id);

// ✅ Pagination
Page<UserStory> stories = repo.findByWorkspaceId(id, PageRequest.of(0, 20));
```

### Frontend Request:

```
GET /api/backlog/workspace-1?page=0&size=20
GET /api/backlog/workspace-1?page=0&size=20&sort=createdAt,desc
```

## 7.5 Response Caching

### In-memory Cache (Caffeine):

```java
@Configuration
@EnableCaching
public class CacheConfig {
    
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        cacheManager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(Duration.ofMinutes(10))
            .recordStats());
        return cacheManager;
    }
}

@Service
public class WorkspaceService {
    
    @Cacheable(value = "workspaces", key = "#id")
    public Workspace getWorkspace(Long id) {
        return workspaceRepository.findById(id);
    }
    
    @CacheEvict(value = "workspaces", key = "#workspace.id")
    public void updateWorkspace(Workspace workspace) {
        // ...
    }
}
```

---

# 8. Distributed Locking (Redis)

## 8.1 Tại sao cần Distributed Lock?

**Local lock** (`synchronized`, `ReentrantLock`) chỉ hoạt động trong **1 JVM**. Multi-instance deployment → mỗi instance có lock riêng → không ngăn được concurrent access.

```
Instance 1: synchronized(lockA) → OK
Instance 2: synchronized(lockA) → OK  ❌ Cả 2 cùng access!
```

## 8.2 Redis SET NX EX Pattern

```python
# Python
import redis

r = redis.Redis(host='localhost', port=6379)

def acquire_lock(lock_name, ttl_seconds=30):
    """
    Acquire lock với SET NX EX (atomic)
    Returns: lock_token nếu thành công, None nếu thất bại
    """
    lock_token = str(uuid.uuid4())
    acquired = r.set(
        f"lock:{lock_name}",      # key
        lock_token,               # value (token để unlock)
        nx=True,                  # Only set if Not eXists
        ex=ttl_seconds            # Expiration
    )
    return lock_token if acquired else None

def release_lock(lock_name, token):
    """
    Unlock chỉ khi token match
    """
    # Lua script: atomic check-and-delete
    lua_script = """
    if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
    else
        return 0
    end
    """
    r.eval(lua_script, 1, f"lock:{lock_name}", token)
```

### Java Implementation:

```java
@Service
@RequiredArgsConstructor
public class RedisDistributedLockService {
    
    private final StringRedisTemplate redisTemplate;
    
    public Optional<String> tryLock(String key, Duration ttl) {
        String token = UUID.randomUUID().toString();
        Boolean acquired = redisTemplate.opsForValue()
            .setIfAbsent(
                "lock:" + key,
                token,
                ttl
            );
        return Boolean.TRUE.equals(acquired) 
            ? Optional.of(token) 
            : Optional.empty();
    }
    
    public void unlock(String key, String token) {
        String script = """
            if redis.call('get', KEYS[1]) == ARGV[1] then
                return redis.call('del', KEYS[1])
            else
                return 0
            end
            """;
        redisTemplate.execute(
            new DefaultRedisScript<>(script, Long.class),
            List.of("lock:" + key),
            token
        );
    }
    
    public <T> T executeWithLock(String key, Duration ttl, Supplier<T> action) {
        String token = tryLock(key, ttl)
            .orElseThrow(() -> new LockAcquisitionException(key));
        try {
            return action.get();
        } finally {
            unlock(key, token);
        }
    }
}
```

## 8.3 Key Patterns

```java
// Graph rebuild lock
"lock:graph:rebuild:{workspaceId}"

// Sprint assignment lock  
"lock:sprint:assign:{sprintId}"

// Report generation lock
"lock:report:generate:{reportId}"
```

## 8.4 Watchdog (Auto-Renew)

```java
// Redisson: Tự động renew TTL nếu vẫn holding
RLock lock = redissonClient.getLock("myLock");
lock.lock();  // Watchdog: auto renew every 10s

// Lock tự release nếu holder crash
```

### Manual Watchdog:

```java
ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

public String tryLockWithWatchdog(String key, Duration ttl) {
    String token = tryLock(key, ttl);
    if (token == null) return null;
    
    // Schedule renewal trước khi TTL expire
    scheduler.scheduleAtFixedRate(() -> {
        if (isStillHolding(key, token)) {
            redisTemplate.expire("lock:" + key, ttl);
        }
    }, ttl.toMillis() / 2, ttl.toMillis() / 2, TimeUnit.MILLISECONDS);
    
    return token;
}
```

## 8.5 Distributed Lock Pitfalls

| Pitfall | Problem | Solution |
|---------|---------|----------|
| **Lock expiration** | Job chạy lâu hơn TTL → auto-release → other instance acquire | Set TTL > max job duration + watchdog |
| **Unlock wrong lock** | Delete lock của process khác | Lua script check token |
| **Redis single point** | Redis down → không acquire được | Redis Sentinel/Cluster |
| **Unreliable clock** | Different server clocks | Redis expiration is single-source |

---

# 9. Concurrency Patterns trong Java

## 9.1 ThreadPoolExecutor

```java
// Create thread pool
ExecutorService executor = new ThreadPoolExecutor(
    4,                          // corePoolSize
    8,                          // maxPoolSize
    60L, TimeUnit.SECONDS,      // keepAliveTime
    new LinkedBlockingQueue<>(), // queue
    new ThreadFactory() {
        @Override
        public Thread newThread(Runnable r) {
            Thread t = new Thread(r);
            t.setName("worker-" + counter.getAndIncrement());
            return t;
        }
    },
    new ThreadPoolExecutor.CallerRunsPolicy()  // Rejection policy
);
```

## 9.2 CompletableFuture

```java
// Non-blocking async
CompletableFuture<UserStory> storyFuture = 
    CompletableFuture.supplyAsync(() -> 
        repository.findById(storyId), executor);

// Chain operations
storyFuture
    .thenApply(story -> enrichWithSprint(story))      // Continue
    .thenCompose(story -> fetchTeamMembers(story))     // Flatten
    .thenAccept(story -> sendToClient(story))          // Terminal
    .exceptionally(ex -> handleError(ex));             // Error handling
```

## 9.3 ConcurrentHashMap Patterns

```java
// In-flight requests tracking (Single Flight)
ConcurrentHashMap<String, CompletableFuture<Result>> inFlight = new ConcurrentHashMap<>();

public Result getData(String key) {
    return inFlight.compute(key, (k, existing) -> {
        if (existing != null) {
            // Request đang chạy, reuse
            return existing;
        }
        // New request
        CompletableFuture<Result> future = fetchData(key);
        future.whenComplete((result, error) -> {
            inFlight.remove(key);  // Cleanup
        });
        return future;
    }).join();
}
```

## 9.4 Semaphore (Rate Limiting)

```java
// Cho phép N concurrent operations
Semaphore semaphore = new Semaphore(10);

public void doWork() {
    semaphore.acquire();
    try {
        // Critical section
    } finally {
        semaphore.release();
    }
}
```

## 9.5 CountDownLatch

```java
// Đợi N tasks hoàn thành
CountDownLatch latch = new CountDownLatch(3);

for (int i = 0; i < 3; i++) {
    executor.submit(() -> {
        try {
            process();
        } finally {
            latch.countDown();
        }
    });
}

latch.await();  // Block cho đến khi count = 0
```

## 9.6 Phaser

```java
// Phức tạp hơn: Nhiều phases
Phaser phaser = new Phaser(3);  // 3 parties

// Phase 1: Tất cả workers đọc data
phaser.arriveAndAwaitAdvance();

// Phase 2: Tất cả workers process
phaser.arriveAndAwaitAdvance();

// Phase 3: Tất cả workers write
phaser.arriveAndDeregister();
```

---

# 10. Single Flight Pattern

## 10.1 Problem

```
100 requests cho cùng workspace rebuild
→ 100 RabbitMQ messages
→ 100 graph rebuilds
→ CPU + I/O waste!
```

## 10.2 Solution: Deduplicate

```java
@Service
@RequiredArgsConstructor
public class GraphRebuildCoordinator {
    
    // In-process: coalesce concurrent requests
    private final ConcurrentHashMap<String, CompletableFuture<Void>> inFlight = 
        new ConcurrentHashMap<>();
    
    // Distributed: prevent cross-instance rebuild
    private final DistributedLockService lockService;
    
    // Debounce: batch rapid requests
    private final ConcurrentHashMap<String, ScheduledFuture<?>> debounceTasks = 
        new ConcurrentHashMap<>();
    
    private static final Duration DEBOUNCE_DELAY = Duration.ofSeconds(3);
    private static final Duration LOCK_TTL = Duration.ofMinutes(5);
    
    public void triggerRebuild(String workspaceId) {
        inFlight.computeIfAbsent(workspaceId, wid -> {
            // Debounce: batch requests trong 3s
            ScheduledFuture<?> existing = debounceTasks.get(wid);
            if (existing != null) {
                existing.cancel(false);
            }
            
            ScheduledFuture<?> task = scheduler.schedule(() -> {
                try {
                    rebuild(wid);
                } finally {
                    inFlight.remove(wid);
                    debounceTasks.remove(wid);
                }
            }, DEBOUNCE_DELAY.toMillis(), TimeUnit.MILLISECONDS);
            
            debounceTasks.put(wid, task);
            return CompletableFuture.completedFuture(null);
        });
    }
    
    private void rebuild(String workspaceId) {
        // Distributed lock: ensure only 1 instance rebuilds
        lockService.executeWithLock(
            "lock:graph:rebuild:" + workspaceId,
            LOCK_TTL,
            () -> {
                // Send single RabbitMQ message
                graphEventPort.sendRebuildEvent(workspaceId);
            }
        );
    }
}
```

## 10.3 Python Implementation

```python
import asyncio
from redis.asyncio import Redis
from aiormq import connect

class GraphRebuildConsumer:
    def __init__(self):
        self.redis = Redis(host='redis')
        self.in_flight: dict[str, asyncio.Task] = {}
        self.debounce_seconds = 3
    
    async def trigger_rebuild(self, workspace_id: str):
        # Check in-flight
        if workspace_id in self.in_flight:
            return  # Already rebuilding
        
        # Debounce
        existing = await self.redis.get(f"debounce:{workspace_id}")
        if existing:
            await self.redis.setex(
                f"debounce:{workspace_id}",
                self.debounce_seconds,
                "1"
            )
            return
        
        await self.redis.setex(
            f"debounce:{workspace_id}",
            self.debounce_seconds,
            "1"
        )
        
        # Distributed lock
        lock = self.redis.lock(
            f"lock:graph:rebuild:{workspace_id}",
            timeout=300
        )
        
        async with await lock.acquire():
            # Rebuild
            await self.rebuild_workspace(workspace_id)
    
    async def rebuild_workspace(self, workspace_id: str):
        # Remove from in-flight
        self.in_flight.pop(workspace_id, None)
        
        # RabbitMQ message
        channel = await self.get_channel()
        await channel.default_exchange.publish(
            Message(f"rebuild:{workspace_id}".encode()),
            routing_key="graph.rebuild"
        )
```

## 10.4 Single Flight vs 其他 Patterns

| Pattern | Mục đích | Khi nào dùng |
|---------|----------|-------------|
| **Single Flight** | Deduplicate requests cùng key | Multiple clients request same data |
| **Cache-Aside** | Store computed results | Expensive computation, common keys |
| **Write-Behind** | Batch writes | High-frequency updates |
| **Debounce** | Batch rapid requests | User typing, UI events |

---

# 11. Transaction Isolation Levels

## 11.1 MySQL Isolation Levels

```sql
-- Set isolation level
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Hoặc per-connection
SET SESSION tx_isolation = 'READ-COMMITTED';
```

| Level | Dirty Read | Non-Repeatable Read | Phantom Read |
|-------|------------|---------------------|--------------|
| READ UNCOMMITTED | ✅ Có | ✅ Có | ✅ Có |
| READ COMMITTED | ❌ Không | ✅ Có | ✅ Có |
| REPEATABLE READ | ❌ Không | ❌ Không | ✅ Có* |
| SERIALIZABLE | ❌ Không | ❌ Không | ❌ Không |

*InnoDB: MVCC prevents phantom reads even at REPEATABLE READ

## 11.2 Spring Isolation Levels

```java
@Transactional(isolation = Isolation.REPEATABLE_READ)
public void process() {
    // ...
}
```

## 11.3 MVCC (Multi-Version Concurrency Control)

```
┌─────────────────────────────────────────────────────────┐
│                         InnoDB MVCC                     │
├─────────────────────────────────────────────────────────┤
│  Transaction A reads:                                   │
│  ┌──────┬─────────┬─────────┐                          │
│  │ Row  │ Version │ Data    │                          │
│  ├──────┼─────────┼─────────┤                          │
│  │  1   │    3    │ v3      │ ← Current (T_A sees v2)  │
│  │  1   │    2    │ v2      │ ← T_A's read snapshot     │
│  │  1   │    1    │ v1      │                          │
│  └──────┴─────────┴─────────┘                          │
│                                                         │
│  Transaction B writes:                                  │
│  ┌──────┬─────────┬─────────┐                          │
│  │  1   │    4    │ v4      │ ← T_B's new version      │
│  │  1   │    3    │ v3      │                          │
│  └──────┴─────────┴─────────┘                          │
│  → T_A không thấy T_B's write (isolation)              │
└─────────────────────────────────────────────────────────┘
```

---

# 12. Read Replica & Write Separation

## 12.1 Mục đích

```
                    ┌──────────────────┐
                    │   Application    │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │   Master DB     │           │   Slave DB      │
    │   (Writes)      │  ──repl── │   (Reads)       │
    └─────────────────┘           └─────────────────┘
```

- **Master:** Xử lý writes, replication
- **Slave:** Phục vụ reads, giảm tải master

## 12.2 Spring Implementation

```java
// DataSource Router
public class RoutingDataSource extends AbstractRoutingDataSource {
    
    @Override
    protected Object determineCurrentLookupKey() {
        // Check current transaction
        if (TransactionSynchronizationManager
                .isCurrentTransactionReadOnly()) {
            return "slave";
        }
        return "master";
    }
}

// Configuration
@Bean
public DataSource dataSource() {
    RoutingDataSource routing = new RoutingDataSource();
    
    Map<Object, DataSource> targets = Map.of(
        "master", masterDataSource(),
        "slave", slaveDataSource()
    );
    routing.setTargetDataSources(targets);
    
    return routing;
}
```

## 12.3 Annotation-Based

```java
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface ReadOnly {
}

@Aspect
@Component
@RequiredArgsConstructor
public class ReadOnlyInterceptor {
    
    private final DataSource dataSource;  // RoutingDataSource
    
    @Around("@annotation(readOnly)")
    public Object enforceReadOnly(ProceedingJoinPoint pjp, ReadOnly readOnly) {
        // Spring sẽ route đến slave
        return pjp.proceed();
    }
}

// Usage
@ReadOnly
@GetMapping("/backlog/{workspaceId}")
public List<UserStory> getBacklog(@PathVariable String workspaceId) {
    return storyService.findBacklog(workspaceId);
}
```

## 12.4 Read-After-Write Consistency

```java
@Service
@RequiredArgsConstructor
public class UserStoryService {
    
    public UserStory createStory(CreateStoryRequest request) {
        // Write to master
        UserStory story = repo.save(request.toEntity());
        
        // Bypass routing: force master read
        TransactionSynchronizationManager
            .registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    // After commit, we want to read from master
                    // for read-after-write consistency
                }
            });
        
        return story;
    }
    
    public UserStory getStory(Long id) {
        // Default: slave read
        return repo.findById(id).orElseThrow();
    }
}
```

---

# 13. Hands-on Labs

## Lab 1: Reproduce Database Deadlock

### Setup:

```java
@Test
public void reproduceDeadlock() throws Exception {
    ExecutorService executor = Executors.newFixedThreadPool(2);
    CountDownLatch startLatch = new CountDownLatch(1);
    
    // Thread A: update stories [1, 2, 3]
    Future<?> futureA = executor.submit(() -> {
        startLatch.await();
        sprintService.addUserStoriesToSprint(1L, Arrays.asList(1L, 2L, 3L));
    });
    
    // Thread B: update stories [3, 2, 1] (reverse order)
    Future<?> futureB = executor.submit(() -> {
        startLatch.await();
        sprintService.addUserStoriesToSprint(1L, Arrays.asList(3L, 2L, 1L));
    });
    
    // Start both threads simultaneously
    startLatch.countDown();
    
    // Wait for results
    try {
        futureA.get(5, TimeUnit.SECONDS);
        futureB.get(5, TimeUnit.SECONDS);
        fail("Expected OptimisticLockException or deadlock exception");
    } catch (ExecutionException ex) {
        // Expect one of these:
        // - PessimisticLockingFailureException (Spring wraps MySQL 1213)
        // - MySQLTransactionRollbackException
        assertTrue(ex.getCause() instanceof PessimisticLockingFailureException);
    }
}
```

### Verify Deadlock:

```sql
SHOW ENGINE INNODB STATUS\G
```

## Lab 2: Implement Optimistic Lock

### Bước 1: Thêm version column

```sql
ALTER TABLE user_story ADD COLUMN us_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE user_story ADD CONSTRAINT uk_user_story_version UNIQUE (us_id, us_version);
```

### Bước 2: Thêm annotation

```java
@Version
@Column(name = "us_version")
private Long version;
```

### Bước 3: Handle exception

```java
@ExceptionHandler(OptimisticLockException.class)
public ResponseEntity<?> handleConflict(OptimisticLockException ex) {
    return ResponseEntity
        .status(HttpStatus.CONFLICT)
        .body(Map.of(
            "error", "VERSION_CONFLICT",
            "message", "Data was modified by another user. Please refresh."
        ));
}
```

## Lab 3: Fix N+1 Query

### Before:

```java
public List<StoryDTO> getBacklog(String workspaceId) {
    List<UserStory> stories = storyRepository.findByWorkspaceId(workspaceId);
    return stories.stream()
        .map(this::toDTO)  // 💥 N+1: getSprint() triggers lazy load
        .collect(Collectors.toList());
}
```

### After:

```java
@Query("""
    SELECT DISTINCT s FROM UserStory s
    LEFT JOIN FETCH s.sprint
    LEFT JOIN FETCH s.workspace
    WHERE s.workspace.id = :workspaceId AND s.sprint IS NULL
    """)
List<UserStory> findBacklogWithRelations(@Param("workspaceId") String workspaceId);

public List<StoryDTO> getBacklog(String workspaceId) {
    List<UserStory> stories = storyRepository.findBacklogWithRelations(workspaceId);
    return stories.stream()
        .map(this::toDTO)  // ✅ No additional queries
        .collect(Collectors.toList());
}
```

## Lab 4: Distributed Lock với Redis

### Test:

```java
@Test
public void testDistributedLock() throws Exception {
    DistributedLockService lock1 = createLockService("instance-1");
    DistributedLockService lock2 = createLockService("instance-2");
    
    // Lock 1 acquires
    Optional<String> token1 = lock1.tryLock("test-key", Duration.ofSeconds(30));
    assertTrue(token1.isPresent());
    
    // Lock 2 cannot acquire (key already held)
    Optional<String> token2 = lock2.tryLock("test-key", Duration.ofSeconds(30));
    assertFalse(token2.isPresent());
    
    // Lock 1 releases
    lock1.unlock("test-key", token1.get());
    
    // Now Lock 2 can acquire
    token2 = lock2.tryLock("test-key", Duration.ofSeconds(30));
    assertTrue(token2.isPresent());
}
```

## Lab 5: Single Flight Implementation

### Test:

```java
@Test
public void testSingleFlight() throws Exception {
    AtomicInteger rebuildCount = new AtomicInteger(0);
    GraphRebuildCoordinator coordinator = createCoordinator(rebuildCount);
    
    // Fire 100 requests
    List<Thread> threads = new ArrayList<>();
    for (int i = 0; i < 100; i++) {
        threads.add(new Thread(() -> coordinator.triggerRebuild("workspace-1")));
    }
    threads.forEach(Thread::start);
    threads.forEach(Thread::join);
    
    // Should only rebuild once
    assertEquals(1, rebuildCount.get());
}
```

---

# Summary

## Key Takeaways

### Deadlock
- **Nguyên nhân:** Lock ordering không nhất quán → circular wait
- **Giải pháp:** Sort IDs trước khi acquire locks
- **Backup:** Retry với exponential backoff

### Race Conditions
- **Lost Update:** Last write wins, no detection
- **Giải pháp:** `@Version` (optimistic) hoặc `FOR UPDATE` (pessimistic)

### N+1 Query
- **Nguyên nhân:** Lazy loading trong loop
- **Giải pháp:** `JOIN FETCH` hoặc batch fetching

### Distributed Lock
- **Nguyên nhân:** Local locks không cross-JVM
- **Giải pháp:** Redis SET NX EX + Lua script unlock

### Single Flight
- **Nguyên nhân:** N requests → N jobs cùng làm 1 việc
- **Giải pháp:** In-process deduplication + distributed lock + debounce

---

# References

1. **MySQL 8.0 Reference Manual** - InnoDB Locking
2. **Java Concurrency in Practice** - Brian Goetz
3. **Effective Java** - Item 78-84: Concurrency
4. **Designing Data-Intensive Applications** - Martin Kleppmann
5. **Spring Framework Documentation** - Transaction Management
6. **Redis Documentation** - Distributed Locks
7. **The Google SRE Book** - Chapter 21: Handling Overload (Single Flight)

---

*Document version: 1.0*
*Last updated: 2024*
