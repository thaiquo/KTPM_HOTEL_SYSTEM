export type PolicyHighlight = {
  title: string;
  value: string;
  description: string;
};

export type PolicySection = {
  title: string;
  eyebrow: string;
  summary: string;
  items: string[];
};

export const policyHighlights: PolicyHighlight[] = [
  {
    title: 'Check-in chuẩn',
    value: '14:00',
    description: 'Nhận phòng sớm có thể tính phụ thu theo khung giờ.',
  },
  {
    title: 'Check-out chuẩn',
    value: '12:00',
    description: 'Trả phòng trễ dưới 30 phút được miễn phí.',
  },
  {
    title: 'Hủy miễn phí',
    value: '24h / 72h',
    description: '24 giờ cho ngày thường, 72 giờ cho Lễ/Tết.',
  },
  {
    title: 'SLA hoàn tiền',
    value: '48 giờ',
    description: 'Refund quá hạn được cảnh báo và ưu tiên xử lý.',
  },
];

export const policySections: PolicySection[] = [
  {
    title: 'Nhận phòng',
    eyebrow: 'Check-in',
    summary: 'Khách sạn áp dụng khung giờ chuẩn 14:00, với các mức phụ thu rõ ràng nếu khách muốn nhận sớm hơn.',
    items: [
      'Trước 07:00: phụ thu 100% giá 1 đêm.',
      'Từ 07:00 đến trước 12:00: phụ thu 50% giá 1 đêm.',
      'Từ 12:00 đến trước 14:00: miễn phí nếu phòng sẵn sàng.',
      'Khách nên mang giấy tờ tùy thân để đối chiếu khi đến quầy.',
    ],
  },
  {
    title: 'Trả phòng',
    eyebrow: 'Check-out',
    summary: 'Chuẩn trả phòng là 12:00. Sau mốc này, hệ thống tính theo từng khoảng thời gian trễ.',
    items: [
      'Trễ dưới 30 phút: miễn phí.',
      'Từ 12:00 đến trước 14:00: phụ thu 20% giá 1 đêm.',
      'Từ 14:00 đến 18:00: phụ thu 50% giá 1 đêm.',
      'Sau 18:00: phụ thu 100% giá 1 đêm.',
    ],
  },
  {
    title: 'Hủy phòng',
    eyebrow: 'Cancellation',
    summary: 'Chính sách hủy phụ thuộc ngày thường, Lễ/Tết và loại gói đặt phòng.',
    items: [
      'Ngày thường: hủy trước 24 giờ được miễn phí.',
      'Lễ/Tết: hủy trước 72 giờ được miễn phí.',
      'Gói không hoàn tiền: không được hủy để hoàn tiền.',
      'Hủy sát ngày nhận phòng có thể bị tính phí một đêm hoặc mất cọc tùy gói.',
    ],
  },
  {
    title: 'Hoàn tiền',
    eyebrow: 'Refund',
    summary: 'Hoàn tiền được xử lý theo nguồn thanh toán và SLA nội bộ của bộ phận vận hành.',
    items: [
      'Refund do hủy booking được đẩy vào hàng đợi xử lý.',
      'SLA xử lý hoàn tiền tiêu chuẩn: 48 giờ.',
      'Refund do checkout sớm được xử lý ngay bởi nhân viên đang thao tác checkout.',
      'Tiền hoàn về tài khoản thường mất 1-3 ngày làm việc tùy ngân hàng/cổng thanh toán.',
    ],
  },
  {
    title: 'Chính sách đặt phòng',
    eyebrow: 'Rate plan',
    summary: 'Khách sạn dùng hai kiểu gói phổ biến để cân bằng linh hoạt và đảm bảo doanh thu.',
    items: [
      'Flexible: cọc 50%, cho phép thay đổi thông tin, miễn phí hủy trước 24 giờ.',
      'Non-refundable: cọc 100%, giảm giá 10%, không cho phép hủy hoàn tiền.',
      'Lễ/Tết áp dụng hệ số giá 1.3x và tối thiểu 2 đêm lưu trú.',
      'Ngày thường áp dụng hệ số giá 1.0x và tối thiểu 1 đêm lưu trú.',
    ],
  },
  {
    title: 'Rời phòng sớm',
    eyebrow: 'Early check-out',
    summary: 'Nếu khách rời phòng trước thời gian đã đặt, hệ thống vẫn giữ mức sàn tối thiểu theo chính sách.',
    items: [
      'Tối thiểu tính phí 2 đêm.',
      'Phần đêm không dùng được hoàn lại 80% sau khi trừ số đêm tối thiểu.',
      'Gói không hoàn tiền không áp dụng refund cho checkout sớm.',
      'Nhân viên sẽ xác nhận lại số đêm dùng thực tế trước khi chốt tiền.',
    ],
  },
];

export const policyQuestions = [
  'quy dinh',
  'noi quy',
  'chinh sach',
  'checkin som',
  'check-in som',
  'checkout tre',
  'check-out tre',
  'late checkout',
  'early check in',
  'early check-in',
  'huy phong',
  'huy dat phong',
  'hoan tien',
  'refund',
  'tra phong som',
  'early checkout',
];
