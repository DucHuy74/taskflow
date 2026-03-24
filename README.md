# NCKH_1_2025_2026_NGUYEN_HUY_QUAN

## IEEE TEMPLATE 

conference /original research template

## Spring boot

https://github.com/spring-guides/gs-serving-web-content

## Test

### Install KeyCloak on Docker

`docker pull quay.io/keycloak/keycloak:25.0.0`

Run keyCloak on port 8180

`docker run -d --name keycloak-25.0.0 -p 8180:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak:25.0.0 start-dev`

`docker run -d --name neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/12345678 neo4j:5`

### MySQL Replica
MySQL Master-Slave Replication với Docker
Master: dùng để ghi dữ liệu (WRITE)
Slave: dùng để đọc dữ liệu (READ)
Java Service → ghi DB (Master)
Python Service → đọc DB (Slave)
📁 Structure
mysql-replication/
├── docker-compose.yml
├── master.cnf
├── slave.cnf
├── master-data/
└── slave-data/
 1. Start hệ thống
docker-compose up -d

Kiểm tra container:

docker ps

 Cần thấy:
mysql-master
mysql-slave

 2. Cấu hình Master
🔹 Bước 1: Truy cập vào Master

docker exec -it mysql-master mysql -uroot -proot

🔹 Bước 2: Tạo user replication

CREATE USER 'replica'@'%' IDENTIFIED BY '123456';

GRANT REPLICATION SLAVE ON *.* TO 'replica'@'%';

FLUSH PRIVILEGES;

🔹 Bước 3: Lấy log position
SHOW MASTER STATUS;

Ví dụ:

File: mysql-bin.000001
Position: 157

👉 ⚠️ Lưu lại 2 giá trị này (FILE + POSITION)

🔄 3. Cấu hình Slave
🔹 Bước 4: Truy cập vào Slave
docker exec -it mysql-slave mysql -uroot -proot

🔹 Bước 5: Kết nối Slave → Master

CHANGE MASTER TO
  MASTER_HOST='mysql-master',
  MASTER_USER='replica',
  MASTER_PASSWORD='123456',
  MASTER_LOG_FILE='mysql-bin.000001',
  MASTER_LOG_POS=157;
  
🔹 Bước 6: Start replication

START SLAVE;
 
🔹 Bước 7: Kiểm tra trạng thái

SHOW SLAVE STATUS\G

👉 Tìm:

Slave_IO_Running: Yes
Slave_SQL_Running: Yes

✔ Nếu cả 2 = Yes → Replication OK

🧪 4. Test Replication

🔹 Tạo dữ liệu ở Master

CREATE TABLE test (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50)
);

INSERT INTO test (name) VALUES ('hello');

🔹 Kiểm tra ở Slave

SELECT * FROM test;

 Nếu thấy:

hello

 Replication thành công
