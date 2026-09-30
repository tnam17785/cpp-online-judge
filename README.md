# C++ Online Judge (Static Web)

Web tĩnh kiểm tra code C++ theo phong cách thi HSG Tin học.

## Tính năng

- Ô dán code C++ (hỗ trợ paste nhanh)
- Upload file ZIP chứa nhiều bộ test của nhiều bài → tự phân loại theo từng bài
- Chọn bài muốn nộp → dán code → Chấm
- Điều chỉnh **giới hạn thời gian** (giây) và **giới hạn bộ nhớ** (MB)
- Bảng kết quả chi tiết từng testcase:
  - 🟢 Xanh = Accepted (AC)
  - 🔴 Đỏ = Wrong Answer / Time Limit Exceeded / Memory Limit Exceeded / Runtime Error / Compile Error
- Tổng kết % số test đúng của bài

## Định dạng ZIP bộ test

Cấu trúc khuyến nghị:

```
problems.zip
├── Bai1/
│   ├── 01.in
│   ├── 01.out
│   ├── 02.in
│   └── 02.out
├── Bai2/
│   ├── test1.in
│   ├── test1.out
│   └── ...
└── ...
```

Hoặc các tên file phổ biến: `*.in` / `*.out`, `input*.txt` / `output*.txt`, `*.inp` / `*.out`.

Mỗi thư mục gốc trong ZIP = 1 bài.

## Cách chạy

1. Mở [GitHub Pages](https://tnam17785.github.io/cpp-online-judge/) (sau khi bật Pages) hoặc mở `index.html` local.
2. Upload ZIP bộ test.
3. Chọn bài → chỉnh TL/ML nếu cần → dán code → **Chấm bài**.

> Lưu ý: Code được gửi đến [Wandbox](https://wandbox.org) (API công khai) để biên dịch & chạy. Có giới hạn tốc độ request, nên chấm tuần tự từng test.

## Công nghệ

- Pure HTML / CSS / JS (static)
- JSZip (đọc ZIP)
- Wandbox API (biên dịch & chạy C++)
- Không cần backend, không cần API key

## License

MIT
