# Lingua Quest

Website học từ vựng và ngữ pháp tiếng Anh, có game luyện tập và đăng nhập Firebase.

## Chạy local

Trong VS Code, chọn **Tasks: Run Task → Start Lingua Quest localhost**, sau đó mở <http://localhost:8080>.

## GitHub Pages

Repository này được cấu hình tự triển khai website bằng GitHub Actions sau mỗi lần push lên `main`. Trang sẽ có địa chỉ:

<https://brogays.github.io/skibidienglish/>

Firebase Authentication cần cho phép domain `brogays.github.io` trong danh sách Authorized domains.

GitHub Pages chỉ chạy frontend. Để đồng bộ thống kê, triển khai Python API lên Cloud Run theo [AI_SETUP.md](./AI_SETUP.md), sau đó đặt repository variable `LINGUA_API_BASE_URL` thành URL của Cloud Run và chạy lại workflow Pages.

## Dữ liệu và cấu hình

Không đưa khóa bí mật hoặc service-account key vào repository. `firebase-config.js` chỉ chứa cấu hình client Firebase; quyền truy cập dữ liệu cần tiếp tục được bảo vệ bằng Firebase Rules và API xác thực ID token.
