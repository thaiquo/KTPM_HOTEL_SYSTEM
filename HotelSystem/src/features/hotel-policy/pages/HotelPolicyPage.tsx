import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BadgePercent, Ban, Clock3, MessageCircle, ReceiptText, ShieldCheck } from 'lucide-react';

import Button from '../../../shared/components/ui/Button';
import Card from '../../../shared/components/ui/Card';
import { policyHighlights, policySections } from '../policyData';

const accentGradients = [
  'from-[#d4af37]/30 via-[#f6e7b3]/20 to-transparent',
  'from-sky-500/25 via-sky-200/10 to-transparent',
  'from-emerald-500/20 via-lime-100/10 to-transparent',
];

export default function HotelPolicyPage() {
  return (
    <div className="overflow-hidden bg-[#f7f3ea] text-[#141414]">
      <section className="relative border-b border-black/5 bg-[radial-gradient(circle_at_top_left,_rgba(212,175,55,0.22),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.06),_transparent_28%),linear-gradient(180deg,_#fffaf0_0%,_#f7f3ea_100%)] px-4 py-24 md:px-8">
        <div className="container-custom relative z-10">
          <div className="mx-auto max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-white/85 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-[#8b6a12] shadow-sm"
            >
              <ShieldCheck size={14} /> Quy định khách sạn
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
              className="mt-6 max-w-4xl text-4xl font-black tracking-tight text-[#121212] md:text-6xl"
            >
              Nội quy, check-in, check-out, hủy phòng và hoàn tiền được trình bày rõ ràng, dễ tra cứu.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="mt-6 max-w-3xl text-base leading-8 text-[#4f4f4f] md:text-lg"
            >
              Trang này tổng hợp đúng theo luật nghiệp vụ trong hệ thống để khách hàng, nhân viên và AI cùng tham chiếu.
              Khi cần hỏi nhanh, bạn có thể mở bong bóng chat AI ở góc màn hình để được trả lời theo đúng quy định.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <Link to="/rooms">
                <Button className="rounded-full px-6 py-3 text-sm font-black uppercase tracking-[0.18em]">
                  Xem phòng
                  <ArrowRight size={16} />
                </Button>
              </Link>
              <a href="#policy-details" className="inline-flex items-center justify-center rounded-full border border-[#d4af37]/30 bg-white/80 px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#141414] transition hover:bg-white">
                Xem chi tiết quy định
              </a>
            </motion.div>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-4">
            {policyHighlights.map((item, index) => {
              const gradient = accentGradients[index % accentGradients.length];
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: index * 0.06 }}
                >
                  <Card className="relative h-full overflow-hidden rounded-3xl border border-black/5 bg-white/90 p-5 shadow-[0_14px_40px_rgba(15,15,15,0.08)]">
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
                    <div className="relative">
                      <div className="text-xs font-black uppercase tracking-[0.24em] text-[#7b6a3c]">{item.title}</div>
                      <div className="mt-3 text-3xl font-black text-[#111111]">{item.value}</div>
                      <p className="mt-2 text-sm leading-6 text-[#5a5a5a]">{item.description}</p>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="policy-details" className="px-4 py-20 md:px-8">
        <div className="container-custom">
          <div className="grid gap-6 lg:grid-cols-2">
            {policySections.map((section, index) => (
              <motion.article
                key={section.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.05 }}
              >
                <Card className="h-full overflow-hidden rounded-3xl border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,15,15,0.08)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-[#f6efe1] px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#866516]">
                        {section.eyebrow}
                      </div>
                      <h2 className="mt-4 text-2xl font-black text-[#111111]">{section.title}</h2>
                    </div>
                    {index % 3 === 0 ? <Clock3 className="text-[#d4af37]" size={24} /> : index % 3 === 1 ? <ReceiptText className="text-sky-600" size={24} /> : <BadgePercent className="text-emerald-600" size={24} />}
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[#535353]">{section.summary}</p>
                  <ul className="mt-5 space-y-3">
                    {section.items.map((item) => (
                      <li key={item} className="flex gap-3 rounded-2xl bg-[#faf7f0] px-4 py-3 text-sm leading-6 text-[#303030]">
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#d4af37]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-24 md:px-8">
        <div className="container-custom">
          <Card className="overflow-hidden rounded-[2rem] border border-black/5 bg-gradient-to-br from-[#111111] via-[#1d1a14] to-[#2a2418] p-8 text-white shadow-[0_20px_60px_rgba(15,15,15,0.26)] md:p-10">
            <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-[#f0d88c]">
                  <MessageCircle size={14} /> Hỏi AI về quy định
                </div>
                <h2 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">Muốn biết nhanh quy định theo tình huống thực tế?</h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-white/72">
                  Chat AI của hệ thống đã được cập nhật để trả lời về check-in sớm, checkout trễ, hủy phòng, hoàn tiền và các gói đặt phòng. Bạn chỉ cần hỏi tự nhiên như “checkout trễ 3 tiếng tính sao?” hoặc “hủy trước 2 ngày có mất phí không?”.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link to="/rooms">
                    <Button className="rounded-full bg-[#d4af37] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#141414] hover:brightness-110">
                      Đặt phòng ngay
                    </Button>
                  </Link>
                  <Link to="/my-bookings">
                    <Button variant="outline" className="rounded-full border-white/20 bg-white/5 px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white hover:bg-white/10">
                      Xem đặt phòng của tôi
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="text-xs font-black uppercase tracking-[0.22em] text-[#f0d88c]">Ví dụ hỏi AI</div>
                  <p className="mt-3 text-sm leading-7 text-white/82">“Tôi hủy booking trước 20 giờ thì có được miễn phí không?”</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="text-xs font-black uppercase tracking-[0.22em] text-[#f0d88c]">Ví dụ hỏi AI</div>
                  <p className="mt-3 text-sm leading-7 text-white/82">“Check-out lúc 15:30 tính phí bao nhiêu?”</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="text-xs font-black uppercase tracking-[0.22em] text-[#f0d88c]">Ví dụ hỏi AI</div>
                  <p className="mt-3 text-sm leading-7 text-white/82">“Ngày lễ thì cọc bao nhiêu và tối thiểu mấy đêm?”</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="px-4 pb-24 md:px-8">
        <div className="container-custom">
          <Card className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_14px_36px_rgba(15,15,15,0.08)] md:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-red-700">
                  <Ban size={13} /> Lưu ý ngắn
                </div>
                <h3 className="mt-4 text-xl font-black text-[#111111]">Không có ngoại lệ ngầm</h3>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-[#555]">
                  Nếu khách muốn check-in sớm, check-out trễ, hủy sát ngày hoặc đổi sang gói không hoàn tiền thì hệ thống sẽ tính theo đúng luật đang áp dụng. Khi cần chính xác số tiền, AI hoặc nhân viên sẽ dựa trên ngày giờ và gói đặt phòng thực tế.
                </p>
              </div>
              <Link to="/rooms">
                <Button variant="outline" className="rounded-full px-5 py-3 text-sm font-black uppercase tracking-[0.18em]">
                  Chọn phòng phù hợp
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
