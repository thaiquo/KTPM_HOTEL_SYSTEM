1.Chạy toàn bộ hệ thống
docker compose up -d --build

2.Tắt toàn bộ (giữ container để start lại nhanh)
docker compose stop

3.Chạy lại toàn bộ sau khi stop
docker compose start

4.Tắt và xóa container/network của project
docker compose down

5.Tắt và xóa luôn dữ liệu DB (reset sạch)
docker compose down -v

6.Xem trạng thái
docker compose ps

7.Xem log realtime toàn bộ
docker compose logs -f

8.Xem log 1 service
docker compose logs -f auth-service
docker compose logs -f frontend

9.Chỉ rebuild/chạy lại 1 service khi bạn sửa code
docker compose up -d --build auth-service
docker compose up -d --build frontend

10.Restart 1 service
docker compose restart auth-service
