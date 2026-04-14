# Deploy (GitLab CI/CD)

Dùng cùng với [.gitlab-ci.yml](../.gitlab-ci.yml) để deploy bằng SSH lên server.

## Chuẩn bị server

Trên server (Ubuntu/VPS):

- cài Docker + Docker Compose v2
- tạo thư mục deploy, ví dụ:

```bash
sudo mkdir -p /opt/qlks
sudo chown -R $USER:$USER /opt/qlks
```

## CI/CD Variables cần set

Trong GitLab -> Settings -> CI/CD -> Variables:

- `DEPLOY_HOST` = IP/hostname server
- `DEPLOY_USER` = user SSH
- `DEPLOY_SSH_KEY` = private key (masked, protected)
- `DEPLOY_PATH` = `/opt/qlks`

GitLab đã có sẵn:

- `CI_REGISTRY`, `CI_REGISTRY_IMAGE`, `CI_REGISTRY_USER`, `CI_REGISTRY_PASSWORD`

## Deploy flow

- Pipeline stage `build_images` build + push images lên GitLab Container Registry
- Stage `deploy_prod` (chỉ chạy khi branch `main`) sẽ:
  - rsync thư mục `deploy/` lên server
  - `docker login` vào registry
  - `docker compose -f deploy/docker-compose.deploy.yml pull`
  - `docker compose ... up -d`

## Rollback nhanh

Deploy tag cũ bằng cách redeploy commit/tag trước (pipeline sẽ dùng `IMAGE_TAG=$CI_COMMIT_SHORT_SHA`).
