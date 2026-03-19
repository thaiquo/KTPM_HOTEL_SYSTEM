1. Chay toan bo he thong (production image)
   docker compose up -d --build

2. Che do DEV auto reload (khuyen dung khi dang code)
   docker compose -f docker-compose.dev.yml up -d

3. Xem log realtime de theo doi tu reload
   docker compose -f docker-compose.dev.yml logs -f frontend
   docker compose -f docker-compose.dev.yml logs -f auth-service

4. Khi sua code

- Frontend (Vite): luu file la reload ngay tren trinh duyet
- Backend (Spring Boot + devtools): luu file la service tu restart

5. Dung he thong dev
   docker compose -f docker-compose.dev.yml down

6. Tắt toàn bộ (giữ container để start lại nhanh)
   docker compose stop

7. Chạy lại toàn bộ sau khi stop
   docker compose start

8. Tắt và xóa container/network của project
   docker compose down

9. Tắt và xóa luôn dữ liệu DB (reset sạch)
   docker compose down -v

10. Xem trạng thái
    docker compose ps

11. Xem log realtime toàn bộ
    docker compose logs -f

12. Xem log 1 service
    docker compose logs -f auth-service
    docker compose logs -f frontend

13. Chỉ rebuild/chạy lại 1 service khi bạn sửa code (production compose)
    docker compose up -d --build auth-service
    docker compose up -d --build frontend

14. Restart 1 service
    docker compose restart auth-service
