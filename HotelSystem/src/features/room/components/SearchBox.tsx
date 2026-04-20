import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Users, ChevronDown } from 'lucide-react';
import { addDays, format } from 'date-fns';
import Button from '../../../shared/components/ui/Button';

const SearchBox = () => {
  const navigate = useNavigate();
  const [today] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [tomorrow] = useState(() => format(addDays(new Date(), 1), 'yyyy-MM-dd'));

  const [searchData, setSearchData] = useState({
    location: 'TP Hồ Chí Minh',
    checkIn: today,
    checkOut: tomorrow,
    rooms: 1,
    guests: 4,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      location: searchData.location,
      checkIn: searchData.checkIn,
      checkOut: searchData.checkOut,
      rooms: searchData.rooms.toString(),
      guests: searchData.guests.toString(),
    });
    navigate(`/rooms?${params.toString()}`);
  };

  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-4 lg:p-6">
      <form
        onSubmit={handleSearch}
        className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center"
      >
        {/* Location */}
        <div className="flex flex-col gap-1 border-r border-gray-200 px-3 last:border-0">
          <label className="text-[10px] uppercase tracking-wider text-primary-container font-bold font-label">
            Chọn vị trí
          </label>
          <div className="flex items-center gap-2 text-on-surface font-semibold">
            <MapPin className="w-4 h-4 text-on-surface-variant" />
            <input
              type="text"
              value={searchData.location}
              onChange={(e) => setSearchData({ ...searchData, location: e.target.value })}
              className="w-full bg-transparent outline-none placeholder:text-on-surface-variant/70"
              placeholder="Chọn địa điểm"
            />
          </div>
        </div>

        {/* Date */}
        <div className="flex flex-col gap-1 border-r border-gray-200 px-3 last:border-0">
          <label className="text-[10px] uppercase tracking-wider text-primary-container font-bold font-label">
            Nhận - Trả phòng
          </label>
          <div className="flex items-center gap-2 text-on-surface font-semibold">
            <Calendar className="w-4 h-4 text-on-surface-variant" />
            <input
              type="date"
              value={searchData.checkIn}
              min={today}
              onChange={(e) => setSearchData({ ...searchData, checkIn: e.target.value })}
              className="bg-transparent outline-none w-[110px]"
            />
            <span className="text-on-surface-variant">→</span>
            <input
              type="date"
              value={searchData.checkOut}
              min={searchData.checkIn}
              onChange={(e) => setSearchData({ ...searchData, checkOut: e.target.value })}
              className="bg-transparent outline-none w-[110px]"
            />
          </div>
        </div>

        {/* Rooms & Guests */}
        <div className="flex flex-col gap-1 border-r border-gray-200 px-3 last:border-0">
          <label className="text-[10px] uppercase tracking-wider text-primary-container font-bold font-label">
            Phòng và Khách
          </label>
          <div className="flex items-center gap-2 text-on-surface font-semibold">
            <Users className="w-4 h-4 text-on-surface-variant" />
            <div className="relative flex-1">
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" size={16} />
              <select
                value={`${searchData.rooms}-${searchData.guests}`}
                onChange={(e) => {
                  const [rooms, guests] = e.target.value.split('-').map(Number);
                  setSearchData({ ...searchData, rooms, guests });
                }}
                className="w-full bg-transparent outline-none appearance-none cursor-pointer pr-6"
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

        {/* Search Button */}
        <div className="flex px-2">
          <Button type="submit" className="w-full py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-primary-container/30 transition-all transform active:scale-95">
            Tìm phòng
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SearchBox;
