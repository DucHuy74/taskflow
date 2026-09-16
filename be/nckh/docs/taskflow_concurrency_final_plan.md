# Taskflow --- Concurrency & Database Locking: Final Plan

## 1. Mục tiêu

Mục tiêu của phần này **không chỉ là fix deadlock**.

Hướng phát triển cuối cùng:

> **Thiết kế concurrency control cho Taskflow dựa trên business
> requirement: xác định dữ liệu nào chấp nhận last-write-wins và dữ liệu
> nào bắt buộc strong consistency; sau đó lựa chọn transaction
> isolation, DB row-level locking, optimistic/pessimistic locking,
> deadlock handling và distributed locking phù hợp.**

Nguyên tắc xuyên suốt:

``` text
Business invariant
        ↓
Consistency requirement
        ↓
Transaction
        ↓
Isolation Level
        ↓
Có cần lock không?
        ↓
DB-level / Application-level
        ↓
Fine-grained row lock nếu cần
        ↓
Deadlock prevention + retry
        ↓
Scale nhiều instances?
        ↓
Distributed lock nếu thực sự cần
```

------------------------------------------------------------------------

## 2. Các case thực tế trong Taskflow

### Case A --- Concurrent UserStory Status Update

Ví dụ:

``` text
Initial: TODO

User A → DONE
User B → IN_PROGRESS/TODO
```

Có thể xảy ra last-write-wins.

**Định hướng:** nếu đây chỉ là thao tác kéo thả và người dùng có thể sửa
lại dễ dàng, không nhất thiết phải dùng locking mạnh.

Mục tiêu nghiên cứu:

-   Lost Update
-   Last-write-wins
-   Khi nào nên chấp nhận relaxed consistency
-   Khi nào nên dùng `@Version`

------------------------------------------------------------------------

### Case B --- Add UserStory vào Sprint

Ví dụ:

``` text
T1: Story A → Sprint 1
T2: Story A → Sprint 2
```

Cần xác định business invariant:

> Một UserStory tại một thời điểm được phép thuộc tối đa một Sprint hay
> không?

Nếu không được phép conflict thì cần enforce consistency.

Mục tiêu nghiên cứu:

-   Concurrent update trên cùng UserStory
-   Optimistic vs pessimistic locking
-   Row-level locking
-   Transaction boundary

------------------------------------------------------------------------

### Case C --- Start Sprint --- Ưu tiên cao nhất

Business invariant:

> **Một Workspace chỉ được có tối đa một Sprint ở trạng thái
> `InProgress`.**

Code hiện tại có dạng:

``` text
existsActiveSprint()
        ↓
false
        ↓
setStatus(InProgress)
```

Concurrent scenario:

``` text
T1                         T2

check active → false       check active → false
Sprint A → InProgress      Sprint B → InProgress
commit                     commit
```

Kết quả có thể phá business invariant.

**Đây là case đầu tiên dùng để thực hành concurrency control.**

Mục tiêu nghiên cứu:

-   Check-then-act race condition
-   Write skew
-   Isolation level
-   DB constraint nếu khả thi
-   Row-level pessimistic locking
-   Optimistic locking
-   Trade-off giữa các giải pháp

------------------------------------------------------------------------

### Case D --- Complete Sprint vs Bulk Story Operations

`completeSprint()` có thể update Sprint và nhiều UserStory, trong khi
các request khác cũng có thể update cùng UserStory.

Đây là case dùng để nghiên cứu:

-   Multi-row transaction
-   Lock ordering
-   Deadlock
-   Transaction duration
-   Deadlock retry

------------------------------------------------------------------------

## 3. Phase 1 --- Transaction Fundamentals

Nắm chắc:

-   `BEGIN`
-   `COMMIT`
-   `ROLLBACK`
-   Transaction boundary trong Spring
-   `@Transactional`
-   ACID

Tập trung đặc biệt vào **Isolation**.

Cần trả lời được:

-   Transaction bắt đầu/kết thúc ở đâu?
-   Lock được giữ đến khi nào?
-   Exception nào làm rollback?
-   Hibernate flush xảy ra khi nào?
-   Transaction càng dài ảnh hưởng contention thế nào?

------------------------------------------------------------------------

## 4. Phase 2 --- Transaction Isolation Level

Học và thử nghiệm:

1.  `READ UNCOMMITTED`
2.  `READ COMMITTED`
3.  `REPEATABLE READ`
4.  `SERIALIZABLE`

Các concurrency anomaly cần hiểu:

-   Dirty Read
-   Non-repeatable Read
-   Phantom Read
-   Lost Update
-   Write Skew

Tập trung vào:

``` text
MySQL
  +
InnoDB
  +
REPEATABLE READ / READ COMMITTED
```

Không chọn isolation level theo kiểu "level càng cao càng tốt".

Phải hiểu trade-off:

``` text
Consistency ↑
     ↕
Concurrency / Throughput
```

------------------------------------------------------------------------

## 5. Phase 3 --- InnoDB Locking

Học:

-   Shared Lock (S)
-   Exclusive Lock (X)
-   Record Lock
-   Gap Lock
-   Next-Key Lock
-   `SELECT ... FOR UPDATE`

Mục tiêu quan trọng nhất:

> Biết một SQL cụ thể trong Taskflow đang access và lock những row/index
> entry nào.

Ví dụ:

``` sql
UPDATE user_story
SET spr_id = ?
WHERE us_id = ?;
```

Flow cần hiểu:

``` text
Find row via index
        ↓
Acquire required lock
        ↓
UPDATE
        ↓
Hold lock during transaction
        ↓
COMMIT / ROLLBACK
        ↓
Release
```

------------------------------------------------------------------------

## 6. Phase 4 --- Inspect SQL, Index và Query Plan thật

Không đoán behavior của Hibernate/MySQL.

Bật SQL logging:

``` properties
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
logging.level.org.hibernate.SQL=DEBUG
logging.level.org.hibernate.orm.jdbc.bind=TRACE
```

Quan sát SQL của:

-   `startSprint()`
-   `addUserStoriesToSprint()`
-   `completeSprint()`
-   `removeUserStoryFromSprint()`

Kiểm tra index:

``` sql
SHOW INDEX FROM user_story;
SHOW INDEX FROM sprint;
```

Kiểm tra execution plan:

``` sql
EXPLAIN ...;
```

Chuỗi cần phân tích:

``` text
Java method
    ↓
Hibernate/JPA
    ↓
SQL
    ↓
Index / Query Plan
    ↓
Rows accessed
    ↓
Rows locked
```

------------------------------------------------------------------------

## 7. Phase 5 --- Fine-Grained DB Locking

Theo feedback của senior:

> **Chỉ khóa và ghi đúng resource/row thực sự cần thiết.**

Không mặc định lock toàn table.

Ví dụ transaction cần thay đổi:

``` text
Story A
Story B
Story C
```

thì mục tiêu là chỉ conflict trên các row liên quan, không chặn các
transaction đang làm việc với Story X/Y/Z độc lập.

Cần nghiên cứu:

-   UPDATE tự acquire lock như thế nào
-   Khi nào UPDATE bình thường là đủ
-   Khi nào cần explicit `SELECT ... FOR UPDATE`
-   Lock scope
-   Lock duration

------------------------------------------------------------------------

## 8. Phase 6 --- Optimistic vs Pessimistic Lock

### Optimistic Lock

Thử nghiệm:

``` java
@Version
Long version;
```

Phù hợp để nghiên cứu khi:

-   Conflict không thường xuyên
-   Muốn concurrency cao
-   Có thể detect conflict rồi trả lỗi/retry

Flow:

``` text
T1 read version=1
T2 read version=1

T1 update → version=2
T2 update WHERE version=1
              ↓
        conflict detected
```

### Pessimistic Lock

Nghiên cứu:

``` sql
SELECT ...
FOR UPDATE;
```

Phù hợp khi resource có khả năng conflict cao hoặc business operation
cần bảo vệ state từ lúc đọc đến lúc ghi.

**Không mặc định dùng pessimistic lock cho mọi update.**

------------------------------------------------------------------------

## 9. Phase 7 --- Implement và Test `startSprint()` Concurrency

Đây là implementation priority #1.

### Test scenario

``` text
Workspace W

Sprint A = ToDo
Sprint B = ToDo

T1 → start Sprint A
T2 → start Sprint B
```

Invariant cuối cùng:

``` text
COUNT(InProgress Sprint của Workspace W) <= 1
```

So sánh các hướng giải quyết:

-   Current check-then-update
-   Isolation level phù hợp
-   DB constraint nếu thiết kế cho phép
-   Lock resource đại diện cho Workspace
-   Pessimistic locking
-   Optimistic locking

Chọn giải pháp dựa trên:

-   Correctness
-   Complexity
-   Throughput
-   Lock contention
-   Khả năng scale

------------------------------------------------------------------------

## 10. Phase 8 --- UserStory Consistency Strategy

Không phải mọi update đều cần strong consistency.

### Status kéo thả

Có thể cân nhắc:

``` text
Last-write-wins
```

nếu sai lệch tạm thời có thể được người dùng sửa dễ dàng.

### Các thay đổi phá invariant

Ví dụ:

``` text
Story A → Sprint 1
Story A → Sprint 2
```

phải xác định rule và enforce nếu business không cho phép conflict.

Mục tiêu:

> Không dùng cùng một concurrency strategy cho tất cả API.

------------------------------------------------------------------------

## 11. Phase 9 --- Deadlock Lab

Sau khi hiểu row-level locking mới chủ động nghiên cứu deadlock.

Scenario cơ bản:

``` text
T1                      T2

lock A                  lock B
  ↓                       ↓
request B               request A
  ↓                       ↓
wait                    wait

        DEADLOCK
```

Áp vào các multi-row operation của Taskflow, đặc biệt:

-   `addUserStoriesToSprint()`
-   `completeSprint()`

Kiểm tra MySQL:

``` sql
SHOW ENGINE INNODB STATUS;
```

Phân tích:

-   Transaction nào giữ lock?
-   Transaction nào đang wait?
-   Index nào liên quan?
-   SQL nào gây circular wait?

------------------------------------------------------------------------

## 12. Phase 10 --- Lock Ordering

Nếu nhiều transaction cùng update nhiều resource, nghiên cứu
deterministic lock ordering.

Ví dụ:

``` text
T1: A → B → C
T2: A → B → C
```

thay vì:

``` text
T1: A → B → C
T2: C → B → A
```

Ở application có thể sort ID/entity, nhưng phải **kiểm tra SQL thực tế**
thay vì assume:

``` text
Java collection order
        =
Hibernate UPDATE order
        =
InnoDB lock acquisition order
```

Mục tiêu là xây dựng ordering rule nhất quán cho các operation cùng
access một loại resource nếu thực sự cần.

------------------------------------------------------------------------

## 13. Phase 11 --- Deadlock Recovery / Retry

Deadlock không nhất thiết loại bỏ được 100%.

Flow:

``` text
Transaction attempt 1
        ↓
Deadlock
        ↓
ROLLBACK
        ↓
Backoff
        ↓
Transaction attempt 2
```

Nghiên cứu:

-   MySQL deadlock error
-   Spring exception translation
-   Spring Retry / custom retry
-   Exponential backoff
-   Transaction propagation
-   Transaction boundary

Yêu cầu quan trọng:

> **Mỗi retry phải chạy trong một transaction hợp lệ mới.**

Không retry business operation một cách mù quáng nếu operation không
idempotent.

------------------------------------------------------------------------

## 14. Phase 12 --- Application-Level Lock

Sau khi hiểu DB-level concurrency mới nghiên cứu:

-   `synchronized`
-   `ReentrantLock`
-   Lock theo resource ID

Ví dụ conceptual:

``` text
lock("user-story-A")
        ↓
critical section
        ↓
unlock
```

Ưu điểm:

-   Nhanh
-   Có thể fine-grained theo ID
-   Không nhất thiết tạo DB contention trước critical section

Giới hạn quan trọng:

``` text
Application lock
      ↓
chỉ có hiệu lực trong JVM hiện tại
```

------------------------------------------------------------------------

## 15. Phase 13 --- Scale nhiều Application Instances

Khi:

``` text
Load Balancer
    │
 ┌──┴─────────┐
 ↓            ↓
Instance A   Instance B
```

thì:

``` text
Lock("A") trong JVM A
       ≠
Lock("A") trong JVM B
```

Vì vậy application-local lock không thể là lớp duy nhất đảm bảo
persistent invariant khi nhiều instance cùng truy cập một database.

Cần phân biệt:

``` text
DB Lock
→ coordination thông qua shared DB

Application Lock
→ coordination trong một JVM

Distributed Lock
→ coordination giữa nhiều application instances
```

------------------------------------------------------------------------

## 16. Phase 14 --- Redis Distributed Lock

Chỉ nghiên cứu sau khi đã hiểu vấn đề multi-instance.

Các chủ đề:

-   Shared lock key
-   Resource-based lock
-   Lock ownership
-   TTL
-   Safe release
-   Timeout
-   Redis/network failure
-   Redisson hoặc cơ chế tương đương

Không dùng Redis distributed lock chỉ vì:

> "DB locking khó."

Phải chứng minh business operation thực sự cần distributed coordination.

Nếu correctness hoàn toàn nằm trên persistent relational data, DB
constraint/transaction/locking vẫn là những giải pháp phải được cân nhắc
đầu tiên.

------------------------------------------------------------------------

## 17. Phase 15 --- Benchmark và Trade-off

Sau khi có các implementation thử nghiệm, benchmark.

So sánh:

1.  No explicit lock / last-write-wins
2.  Optimistic locking
3.  Pessimistic row locking
4.  Lock ordering
5.  Application-level ID lock
6.  Distributed lock nếu có use case phù hợp

Metrics:

-   Throughput
-   Average latency
-   P95/P99 latency
-   Conflict count
-   Deadlock count
-   Retry count
-   Lock wait time
-   Transaction duration
-   Error rate

Mục tiêu:

> Không kết luận giải pháp nào "tốt nhất"; kết luận giải pháp nào phù
> hợp với từng business case.

------------------------------------------------------------------------

# 18. Thứ tự implementation thực tế

## Priority 1 --- Foundation

-   [ ] Review Transaction + ACID
-   [ ] Học Transaction Isolation Level
-   [ ] Học InnoDB row locking
-   [ ] Bật Hibernate SQL logging
-   [ ] Kiểm tra index
-   [ ] Chạy `EXPLAIN` cho query quan trọng

## Priority 2 --- Strong-consistency case

-   [ ] Viết concurrent test cho `startSprint()`
-   [ ] Reproduce trường hợp 2 Sprint cùng `InProgress`
-   [ ] Thử các DB-level solution
-   [ ] Chọn solution dựa trên trade-off

## Priority 3 --- UserStory concurrency

-   [ ] Concurrent status update test
-   [ ] Quan sát last-write-wins/lost update
-   [ ] Quyết định status có cần `@Version` không
-   [ ] Test concurrent move Story giữa Sprint/Backlog

## Priority 4 --- Deadlock

-   [ ] Tạo controlled deadlock test
-   [ ] Đọc `SHOW ENGINE INNODB STATUS`
-   [ ] Xác định lock scope/order
-   [ ] Implement deterministic ordering nếu phù hợp
-   [ ] Implement bounded retry nếu cần

## Priority 5 --- Scale

-   [ ] Học application-level ID lock
-   [ ] Hiểu giới hạn single JVM
-   [ ] Mô phỏng 2+ backend instances
-   [ ] Nghiên cứu Redis distributed lock
-   [ ] Chỉ áp dụng khi có use case thực sự phù hợp

## Priority 6 --- Benchmark

-   [ ] Benchmark từng strategy
-   [ ] So sánh consistency/performance/complexity
-   [ ] Document kết quả và quyết định kiến trúc

------------------------------------------------------------------------

# 19. Decision Framework

Mỗi khi gặp concurrency problem mới trong Taskflow, đi theo checklist:

``` text
1. Business invariant là gì?
        ↓
2. Nếu conflict xảy ra thì hậu quả nghiêm trọng không?
        ↓
3. Có chấp nhận last-write-wins không?
        ↓
4. Persistent DB có cần đảm bảo correctness không?
        ↓
5. Isolation level hiện tại làm gì?
        ↓
6. Có cần explicit locking không?
        ↓
7. Nếu cần → lock resource nhỏ nhất có thể
        ↓
8. Optimistic hay pessimistic phù hợp hơn?
        ↓
9. Có multi-row locking → deadlock risk?
        ↓
10. Có cần ordering/retry?
        ↓
11. Chạy 1 hay N application instances?
        ↓
12. Có thực sự cần distributed lock?
        ↓
13. Benchmark trade-off
```

------------------------------------------------------------------------

# 20. Kết luận kiến trúc

Hướng cuối cùng của Taskflow:

``` text
                    BUSINESS REQUIREMENT
                            │
                            ▼
                   CONSISTENCY REQUIRED?
                     /              \
                   NO                YES
                   │                  │
          relaxed consistency      Database
          / last-write-wins           │
                              Transaction + invariant
                                      │
                             appropriate isolation
                                      │
                              fine-grained locking
                               /              \
                         Optimistic        Pessimistic
                              \              /
                               \            /
                            Deadlock awareness
                                   │
                           Ordering + Retry
                                   │
                           Scale nhiều instances?
                              /          \
                            NO            YES
                            │              │
                    App lock nếu cần   DB coordination
                                      hoặc distributed
                                      lock nếu phù hợp
```

## Nguyên tắc chốt

1.  **Business requirement quyết định consistency requirement.**
2.  **Không phải concurrent update nào cũng cần lock.**
3.  **Persistent invariant quan trọng phải được bảo vệ ở tầng đáng tin
    cậy, thường cần DB tham gia.**
4.  **Nếu lock DB, ưu tiên fine-grained locking trên đúng row/resource
    cần thiết thay vì phạm vi quá rộng.**
5.  **Isolation level, index và transaction boundary là một phần của bài
    toán locking.**
6.  **Deadlock là trade-off của concurrency; cần prevention hợp lý và
    recovery khi cần.**
7.  **Application lock theo ID có thể hiệu quả trong một JVM nhưng không
    tự giải quyết multi-instance.**
8.  **Redis distributed lock là một lựa chọn cho distributed
    coordination, không phải mặc định thay thế DB lock.**
9.  **Đối với dữ liệu ít quan trọng như thao tác kéo status,
    last-write-wins có thể là trade-off hợp lý.**
10. **Đối với invariant như "mỗi Workspace chỉ có một Sprint
    InProgress", correctness phải được đảm bảo rõ ràng.**

------------------------------------------------------------------------

## Điểm bắt đầu

**Bắt đầu implementation bằng `startSprint()`**, không phải Redis và
cũng không phải deadlock retry.

``` text
startSprint()
      ↓
Reproduce race condition
      ↓
Understand isolation
      ↓
Inspect SQL/index
      ↓
Implement DB-level protection
      ↓
Concurrent test
      ↓
Benchmark
```

Sau khi hoàn thành case này:

``` text
UserStory Lost Update
        ↓
Multi-row locking
        ↓
Deadlock
        ↓
Ordering + Retry
        ↓
Application Lock
        ↓
Multi-instance
        ↓
Distributed Lock
```

Đây là roadmap cuối cùng cho phần **Concurrency & Database Locking của
Taskflow**.
