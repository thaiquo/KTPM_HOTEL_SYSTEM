import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, ChevronDown } from 'lucide-react';
import { addDays, format } from 'date-fns';
import Button from '../../../shared/components/ui/Button';

const SearchBox = () => {
  const navigate = useNavigate();
  const [today] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [tomorrow] = useState(() => format(addDays(new Date(), 1), 'yyyy-MM-dd'));

  const [searchData, setSearchData] = useState({
    checkIn: today,
    checkOut: tomorrow,
    rooms: 1,
    guests: 4,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      checkIn: searchData.checkIn,
      checkOut: searchData.checkOut,
      rooms: searchData.rooms.toString(),
      guests: searchData.guests.toString(),
    });
    navigate(`/rooms?${params.toString()}`);
  };

  return (
    <div className="w-full">
      <form
        onSubmit={handleSearch}
        className="grid grid-cols-1 items-end gap-4 lg:grid-cols-[1.1fr_1.1fr_1fr_230px]"
      >
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-[0.2em] text-[#d4af37] font-bold">
            Nhận phòng
          </label>
          <div className="flex items-center gap-2 border border-black/10 bg-[#fafafa] px-4 py-4 text-[#111]">
            <Calendar className="h-4 w-4 text-[#d4af37]" />
            <input
              type="date"
              value={searchData.checkIn}
              min={today}
              onChange={(e) => setSearchData({ ...searchData, checkIn: e.target.value })}
              className="w-full bg-transparent outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-[0.2em] text-[#d4af37] font-bold">
            Trả phòng
          </label>
          <div className="flex items-center gap-2 border border-black/10 bg-[#fafafa] px-4 py-4 text-[#111]">
            <Calendar className="h-4 w-4 text-[#d4af37]" />
            <input
              type="date"
              value={searchData.checkOut}
              min={searchData.checkIn}
              onChange={(e) => setSearchData({ ...searchData, checkOut: e.target.value })}
              className="w-full bg-transparent outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-[0.2em] text-[#d4af37] font-bold">
            Số khách
          </label>
          <div className="flex items-center gap-2 border border-black/10 bg-[#fafafa] px-4 py-4 text-[#111]">
            <Users className="h-4 w-4 text-[#d4af37]" />
            <div className="relative flex-1">
              <ChevronDown className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[#888]" size={16} />
              <select
                value={`${searchData.rooms}-${searchData.guests}`}
                onChange={(e) => {
                  const [rooms, guests] = e.target.value.split('-').map(Number);
                  setSearchData({ ...searchData, rooms, guests });
                }}
                className="w-full appearance-none cursor-pointer bg-transparent pr-6 outline-none text-[#111]"
              >
                <option value="1-2">1 Phòng - 2 Khách</option>
                <option value="1-4">1 Phòng - 4 Khách</option>
                <option value="2-4">2 Phòng - 4 Khách</option>
                <option value="2-6">2 Phòng - 6 Khách</option>
                <option value="3-6">3 Phòng - 6 Khách</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex md:pl-2">
          <Button type="submit" className="w-full rounded-none border border-[#d4af37] bg-[#d4af37] py-4 text-[15px] font-extrabold text-[#0f0f0f] transition-all hover:brightness-110">
            Tìm phòng
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SearchBox;
