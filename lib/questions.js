const questions = [
  {
    id: 1,
    question:
      'Câu nói "Vấn đề cơ bản lớn của mọi triết học, đặc biệt là của triết học hiện đại, là vấn đề quan hệ giữa tư duy và tồn tại” là của ai?',
    options: {
      A: "C. Mác",
      B: "Ph. Ăngghen",
      C: "V. I. Lênin",
      D: "L. Phoiơbắc",
    },
    answer: "B",
    category: "Khoa học Mác-Lênin và tư tưởng Hồ Chí Minh",
  },
  {
    id: 2,
    question:
      "Dựa trên những thành tựu khoa học, Ph. Ăngghen đã phân chia vận động thành 5 hình thức cơ bản nào?",
    options: {
      A: "Vận động phản xạ; vận động vật lý; vận động hóa học; vận động cơ bản; vận động xã hội",
      B: "Vận động có ý thức; vận động vật lý; vận động hóa học; vận động sinh học; vận động thô",
      C: "Vận động quần chúng; vận động vật lý; vận động cách mạng; vận động sinh học; vận động xã hội",
      D: "Vận động cơ học; vận động vật lý; vận động hóa học; vận động sinh học; vận động xã hội",
    },
    answer: "D",
    category: "Khoa học Mác-Lênin và tư tưởng Hồ Chí Minh",
  },
  {
    id: 3,
    question:
      'Khẳng định "Bản chất của thế giới là vật chất, thế giới thống nhất ở tính vật chất” là của?',
    options: {
      A: "Hêghen",
      B: "L. Phoiơbắc",
      C: "Chủ nghĩa duy vật biện chứng",
      D: "Chủ nghĩa duy tâm",
    },
    answer: "C",
    category: "Khoa học Mác-Lênin và tư tưởng Hồ Chí Minh",
  },
  {
    id: 4,
    question:
      "Phương hướng “Xây dựng giai cấp công nhân hiện đại, lớn mạnh; nâng cao bản lĩnh chính trị, trình độ học vấn, chuyên môn, kỹ năng nghề nghiệp, tác phong công nghiệp, kỷ luật lao động thích ứng với cuộc Cách mạng công nghiệp lần thứ tư” được xác định trong văn kiện nào?",
    options: {
      A: "Văn kiện Đại hội đại biểu toàn quốc lần thứ XI của Đảng",
      B: "Văn kiện Đại hội đại biểu toàn quốc lần thứ XII của Đảng",
      C: "Văn kiện Đại hội đại biểu toàn quốc lần thứ XIII của Đảng",
      D: "Văn kiện Đại hội đại biểu toàn quốc lần thứ XIV của Đảng",
    },
    answer: "C",
    category: "Khoa học Mác-Lênin và tư tưởng Hồ Chí Minh",
  },
  {
    id: 5,
    question:
      "Vì sao chủ nghĩa xã hội khoa học theo nghĩa rộng là chủ nghĩa Mác - Lênin?",
    options: {
      A: "Vì chủ nghĩa xã hội khoa học đã phác thảo ra mô hình chủ nghĩa xã hội và chủ nghĩa cộng sản",
      B: "Vì chủ nghĩa xã hội khoa học đã luận chứng về sứ mệnh lịch sử của giai cấp công nhân hiện đại",
      C: "Vì chủ nghĩa xã hội khoa học dựa vào triết học, kinh tế chính trị để lý giải tính tất yếu lịch sử của cách mạng xã hội chủ nghĩa và Hình thái kinh tế - xã hội cộng sản chủ nghĩa gắn liền với vai trò lãnh đạo của giai cấp công nhân",
      D: "Cả A, B và C",
    },
    answer: "C",
    category: "Khoa học Mác-Lênin và tư tưởng Hồ Chí Minh",
  },
  {
    id: 6,
    question:
      "Chiến tranh thế giới lần thứ nhất kết thúc, các nước thắng trận họp Hội nghị hòa bình ở Véc xây (Pháp). Thay mặt Hội những người Việt Nam yêu nước, Nguyễn Ái Quốc gửi đến Hội nghị cái gì?",
    options: {
      A: "Báo cáo về tình hình các nước thuộc địa ở Đông Dương",
      B: "Báo cáo về tình hình Việt Nam bị thực dân Pháp áp bức bóc lột",
      C: "Bản “yêu sách” 8 điểm của nhân dân An Nam, đòi Pháp và chủ nghĩa thực dân phải thừa nhận quyền tự do, bình đẳng của nhân dân An Nam",
      D: "Bản “yêu sách” 8 điểm của nhân dân Đông Dương, đòi Pháp và chủ nghĩa thực dân phải thừa nhận quyền tự do, bình đẳng của nhân dân Đông Dương",
    },
    answer: "C",
    category: "Khoa học Mác-Lênin và tư tưởng Hồ Chí Minh",
  },
  {
    id: 7,
    question:
      "Nguyễn Ái Quốc từng bước phác thảo đường lối cứu nước từ sau năm 1920, thể hiện trong tập bài giảng của Người cho những cán bộ cốt cán của Hội Việt Nam Cách mạng Thanh niên tại Quảng Châu (Trung Quốc). Năm 1927 được in thành sách lấy tên là gì?",
    options: {
      A: "Bản án chế độ thực dân Pháp",
      B: "Đường Kách mệnh",
      C: "Nhật ký trong tù",
      D: "Sửa đổi lối làm việc",
    },
    answer: "B",
    category: "Khoa học Mác-Lênin và tư tưởng Hồ Chí Minh",
  },
  {
    id: 8,
    question:
      "Hội nghị Ban Chấp hành Trung ương lần thứ nhất họp vào ngày nào? Ở đâu và do ai chủ trì?",
    options: {
      A: "Họp từ ngày 03-07/2/1930 ở Cửu Long (Trung Quốc) do đồng chí Nguyễn Ái Quốc chủ trì",
      B: "Họp từ ngày 10-15/3/1930 ở Cửu Long (Trung Quốc) do đồng chí Nguyễn Ái Quốc chủ trì",
      C: "Họp từ ngày 15-20/5/1930 ở Cửu Long (Trung Quốc) do đồng chí Nguyễn Ái Quốc chủ trì",
      D: "Họp từ ngày 14-30/10/1930 ở Hương Cảng (Trung Quốc) do đồng chí Trần Phú chủ trì",
    },
    answer: "D",
    category: "Khoa học Mác-Lênin và tư tưởng Hồ Chí Minh",
  },
  {
    id: 9,
    question:
      "Truyền thống của Trường Cao đẳng Kỹ thuật Phòng không - Không quân được khái quát bằng nội dung nào?",
    options: {
      A: "Trung thành vô hạn – Chủ động sáng tạo – Kiên cường vượt khó – Đoàn kết vươn lên – Dạy tốt, rèn nghiêm",
      B: "Trung thành vô hạn – Đoàn kết kỷ luật – Tự lực tự cường – Kiên cường vượt khó – Dạy tốt, học tốt",
      C: "Trung thành vô hạn – Chủ động sáng tạo – Kiên cường vượt khó – Đoàn kết vươn lên – Dạy tốt, học tốt",
      D: "Trung thành tuyệt đối – Chủ động sáng tạo – Kiên cường vượt khó – Đoàn kết vươn lên – Dạy tốt, học tốt",
    },
    answer: "C",
    category: "Khoa học Mác-Lênin và tư tưởng Hồ Chí Minh",
  },
  {
    id: 10,
    question:
      "Giá trị cốt lõi của Nhà trường được khái quát bằng nội dung nào?",
    options: {
      A: "Kiên định – Kỷ luật – Chất lượng – Sáng tạo",
      B: "Kiên định – Chính quy – Chất lượng – Sáng tạo",
      C: "Kiên định – Kỷ luật – Trách nhiệm – Sáng tạo",
      D: "Kiên định – Kỷ luật – Chất lượng – Hiệu quả",
    },
    answer: "A",
    category: "Khoa học Mác-Lênin và tư tưởng Hồ Chí Minh",
  },
];

export default questions;
