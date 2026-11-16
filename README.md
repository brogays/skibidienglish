# Lingua Quest

Website học từ vựng và ngữ pháp tiếng Anh, có game luyện tập và đăng nhập Firebase.

## Chạy local

Trong VS Code, chọn **Tasks: Run Task → Start Lingua Quest localhost**, sau đó mở <http://localhost:8080>.

Ở localhost, website và các chức năng Firebase vẫn chạy; tiến độ thống kê sẽ ở chế độ trên trình duyệt nếu chưa cấu hình `LINGUA_API_BASE_URL`. Muốn dùng đồng bộ thống kê và nhiệm vụ AI, cần chạy Python API theo [AI_SETUP.md](./AI_SETUP.md) và cấu hình URL API.

## GitHub Pages

Repository này được cấu hình tự triển khai website bằng GitHub Actions sau mỗi lần push lên `main`. Trang sẽ có địa chỉ:

<https://brogays.github.io/skibidienglish/>

Firebase Authentication cần cho phép domain `brogays.github.io` trong danh sách Authorized domains.

GitHub Pages chỉ chạy frontend. Để đồng bộ thống kê, triển khai Python API lên Cloud Run theo [AI_SETUP.md](./AI_SETUP.md), sau đó đặt repository variable `LINGUA_API_BASE_URL` thành URL của Cloud Run và chạy lại workflow Pages.

## Cộng đồng và tin nhắn

Bảng tin, lượt thích, bình luận và tin nhắn riêng dùng Firestore. Trước khi các chức năng này hoạt động, triển khai Rules mới:

```powershell
firebase deploy --only firestore:rules,firestore:indexes --project english-f3d71
```

Chỉ tài khoản đăng nhập mới đọc được nội dung cộng đồng; tin nhắn chỉ đọc được bởi hai thành viên trong cuộc trò chuyện. Danh bạ chỉ hiển thị tên công khai, không hiển thị email.

## Dữ liệu và cấu hình

Không đưa khóa bí mật hoặc service-account key vào repository. `firebase-config.js` chỉ chứa cấu hình client Firebase; quyền truy cập dữ liệu cần tiếp tục được bảo vệ bằng Firebase Rules và API xác thực ID token.
