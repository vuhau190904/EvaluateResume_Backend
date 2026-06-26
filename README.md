# EvaluateResume Backend

Backend cho hệ thống đánh giá CV bằng AI. Dự án cho phép người dùng tải CV, so sánh với mô tả công việc, nhận phản hồi cá nhân hóa, luyện phỏng vấn thử và gợi ý việc làm phù hợp với kỹ năng.

Repository này đóng vai trò API service chính: xác thực người dùng, nhận request từ frontend, lưu metadata vào PostgreSQL, upload file lên Google Cloud Storage, đưa các tác vụ AI vào BullMQ queue và theo dõi trạng thái xử lý thông qua Redis.

## Liên kết repository

| Thành phần | Repository |
| --- | --- |
| Frontend | [vuhau190904/EvaluateResume_Frontend](https://github.com/vuhau190904/EvaluateResume_Frontend) |
| Backend | [vuhau190904/EvaluateResume_Backend](https://github.com/vuhau190904/EvaluateResume_Backend) |
| Evaluate Worker | [vuhau190904/EvaluateResume_EvaluateWorker](https://github.com/vuhau190904/EvaluateResume_EvaluateWorker) |

## Kiến trúc hệ thống

![EvaluateResume Architecture](./EvaluateResume.drawio.png)

Hệ thống được thiết kế theo hướng microservice, tách API backend khỏi các worker xử lý tác vụ AI nặng:

1. Frontend gọi Backend qua HTTPS/WebSocket để đăng nhập, tải CV, xem lịch sử đánh giá, luyện phỏng vấn và nhận gợi ý việc làm.
2. Backend xác thực Google OAuth, lưu session token vào Redis và lưu dữ liệu nghiệp vụ vào PostgreSQL thông qua Prisma.
3. File CV được upload lên Google Cloud Storage, đồng thời nội dung PDF được trích xuất để đưa vào job xử lý.
4. Backend push job vào các BullMQ queue trong Redis: `evaluate`, `interview`, `suggest`.
5. Evaluate Worker pull job từ queue, gọi các dịch vụ AI như Gemini qua Vertex AI, OpenAI Whisper và Tavily API.
6. Worker cập nhật kết quả về PostgreSQL và publish trạng thái qua Redis Pub/Sub để hỗ trợ cập nhật realtime.

## Tính năng chính

- Đăng nhập bằng Google OAuth.
- Upload CV dạng PDF và mô tả công việc để đánh giá mức độ phù hợp.
- Trích xuất nội dung CV từ PDF.
- Tạo job đánh giá CV bất đồng bộ bằng BullMQ.
- Lưu lịch sử đánh giá CV theo người dùng.
- Tạo câu hỏi phỏng vấn thử dựa trên CV.
- Nhận câu trả lời bằng text hoặc chuyển giọng nói thành text bằng OpenAI Whisper.
- Sinh feedback phỏng vấn.
- Gợi ý việc làm dựa trên kỹ năng hoặc từ khóa tìm kiếm.

## Tech stack

- Runtime: Node.js
- Framework: Express.js
- Database: PostgreSQL
- ORM: Prisma
- Cache, session, queue: Redis, BullMQ
- Storage: Google Cloud Storage
- Authentication: Google OAuth
- AI services: Vertex AI Gemini, OpenAI Whisper
- Job recommendation: Tavily API

## Cấu trúc thư mục

```text
src/
  controller/        REST API controllers
  database/          Prisma, Redis client, Redis subscriber
  middleware/        Auth middleware, upload middleware
  service/           Business logic services
  util/              Hằng số dùng chung
  server.js          Entry point của Express server
```

## API chính

Base URL mặc định:

```text
http://localhost:3000/api
```

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| `GET` | `/auth/google` | Lấy URL đăng nhập Google |
| `POST` | `/auth/google/login` | Đổi Google authorization code lấy service token |
| `POST` | `/auth/logout` | Đăng xuất và xóa token trong Redis |
| `POST` | `/evaluate/upload` | Upload CV và tạo job đánh giá |
| `GET` | `/evaluate/result/:evaluationId` | Lấy kết quả đánh giá CV |
| `GET` | `/evaluate/history` | Lấy lịch sử đánh giá CV của người dùng |
| `GET` | `/interview/start` | Tạo job sinh câu hỏi phỏng vấn |
| `GET` | `/interview/end` | Tạo job sinh feedback phỏng vấn |
| `GET` | `/interview/get-question` | Lấy danh sách câu hỏi phỏng vấn |
| `POST` | `/interview/submit-answer` | Gửi câu trả lời phỏng vấn |
| `GET` | `/interview/feedback` | Lấy feedback phỏng vấn |
| `POST` | `/interview/speech-to-text` | Chuyển audio thành text bằng Whisper |
| `GET` | `/suggest/job` | Tạo job gợi ý việc làm |
| `GET` | `/suggest/job/:search_id` | Lấy kết quả gợi ý việc làm |
| `GET` | `/suggest/history` | Lấy lịch sử tìm kiếm việc làm |

Các endpoint nghiệp vụ yêu cầu header:

```text
Authorization: Bearer <accessToken>
```

## Cài đặt local

### 1. Clone repository

```bash
git clone https://github.com/vuhau190904/EvaluateResume_Backend.git
cd EvaluateResume_Backend
```

### 2. Cài dependencies

```bash
npm install
```

### 3. Tạo file `.env`

```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/evaluate_resume
REDIS_URL=redis://localhost:6379

EVALUATE_QUEUE_NAME=evaluate
SUGGEST_QUEUE_NAME=suggest
INTERVIEW_QUEUE_NAME=interview
EVALUATION_CHANNEL=evaluation

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback

GCS_PROJECT_ID=your_gcp_project_id
GCS_CLIENT_EMAIL=your_gcs_service_account_email
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GCS_BUCKET_NAME=your_gcs_bucket_name

OPENAI_API_KEY=your_openai_api_key
```

### 4. Chuẩn bị dịch vụ phụ thuộc

Đảm bảo các service sau đang chạy:

- PostgreSQL
- Redis
- Evaluate Worker cùng cấu hình queue name với backend

Worker xử lý các tác vụ AI nặng nằm ở repository [EvaluateResume_EvaluateWorker](https://github.com/vuhau190904/EvaluateResume_EvaluateWorker).

### 5. Chạy server

Chạy ở chế độ development:

```bash
npm run dev
```

Chạy ở chế độ production:

```bash
npm start
```

Server mặc định chạy tại:

```text
http://localhost:3000
```

## Luồng xử lý đánh giá CV

1. Người dùng đăng nhập bằng Google OAuth.
2. Frontend gửi CV PDF và job description đến `/api/evaluate/upload`.
3. Backend trích xuất text từ PDF, tạo bản ghi resume ở trạng thái `pending`.
4. Backend upload file CV lên Google Cloud Storage.
5. Backend push job vào `evaluate` queue.
6. Evaluate Worker pull job, gọi Gemini để đánh giá CV theo job description.
7. Worker cập nhật kết quả và trạng thái vào PostgreSQL.
8. Frontend lấy kết quả qua `/api/evaluate/result/:evaluationId` hoặc theo dõi trạng thái realtime.

## Luồng xử lý phỏng vấn thử

1. Frontend gọi `/api/interview/start?resume_id=<id>`.
2. Backend push job vào `interview` queue để worker sinh câu hỏi.
3. Người dùng trả lời câu hỏi bằng text hoặc audio.
4. Audio được chuyển thành text qua `/api/interview/speech-to-text`.
5. Khi kết thúc, frontend gọi `/api/interview/end?resume_id=<id>`.
6. Worker sinh feedback phỏng vấn và lưu vào database.

## Luồng gợi ý việc làm

1. Frontend gọi `/api/suggest/job?search_input=<keyword>`.
2. Backend tạo search record ở trạng thái `pending`.
3. Backend push job vào `suggest` queue.
4. Worker gọi Tavily API để tìm việc làm phù hợp.
5. Frontend lấy kết quả qua `/api/suggest/job/:search_id`.

## Ghi chú

- Backend chỉ tạo và điều phối job; các tác vụ AI chuyên sâu được xử lý ở worker service.
- Queue name giữa Backend và Worker phải khớp nhau.
- Redis được dùng cho cả session token, BullMQ queue và Pub/Sub channel.
- File upload hiện hỗ trợ PDF cho CV và WAV/FLAC/MP3 cho audio.
