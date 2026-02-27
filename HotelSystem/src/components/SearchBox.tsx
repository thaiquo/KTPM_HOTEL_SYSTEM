import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Users, ChevronDown } from 'lucide-react';
import { addDays, format } from 'date-fns';

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
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 md:p-8">
      <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6">
        {/* Location */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-orange-500 block">
            Chọn vị trí
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchData.location}
              onChange={(e) => setSearchData({ ...searchData, location: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              placeholder="Chọn địa điểm"
            />
          </div>
        </div>

        {/* Check-in Date */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-orange-500 block">
            Nhận - Trả phòng
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="date"
              value={searchData.checkIn}
              min={today}
              onChange={(e) => setSearchData({ ...searchData, checkIn: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {/* Check-out Date */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-400 block">
            &nbsp;
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="date"
              value={searchData.checkOut}
              min={searchData.checkIn}
              onChange={(e) => setSearchData({ ...searchData, checkOut: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {/* Rooms & Guests */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-orange-500 block">
            Phòng và Khách
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            <select
              value={`${searchData.rooms}-${searchData.guests}`}
              onChange={(e) => {
                const [rooms, guests] = e.target.value.split('-').map(Number);
                setSearchData({ ...searchData, rooms, guests });
              }}
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none outline-none bg-white cursor-pointer"
            >
              <option value="1-2">1 Phòng - 2 Khách</option>
              <option value="1-4">1 Phòng - 4 Khách</option>
              <option value="2-4">2 Phòng - 4 Khách</option>
              <option value="2-6">2 Phòng - 6 Khách</option>
              <option value="3-6">3 Phòng - 6 Khách</option>
            </select>
          </div>
        </div>

        {/* Search Button */}
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full bg-orange-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-orange-600 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Tìm phòng
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchBox;