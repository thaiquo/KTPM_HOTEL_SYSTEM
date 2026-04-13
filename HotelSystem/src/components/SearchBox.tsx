import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Users, ChevronDown } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { Button } from './ui/Button';

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

  const SearchField = ({ 
    label, 
    icon: Icon, 
    children 
  }: { 
    label: string
    icon: React.ComponentType<any>
    children: React.ReactNode 
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-foreground block">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
        {children}
      </div>
    </div>
  );

  return (
    <div className="bg-white/98 backdrop-blur-md rounded-2xl shadow-2xl p-6 lg:p-8 border border-white/50">
      <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-5">
        {/* Location */}
        <SearchField label="Vị trí" icon={MapPin}>
          <input
            type="text"
            value={searchData.location}
            onChange={(e) => setSearchData({ ...searchData, location: e.target.value })}
            className="w-full pl-11 pr-4 py-3 bg-secondary border-2 border-border rounded-lg
              text-foreground placeholder-text-muted
              focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
              transition-all duration-200"
            placeholder="Nhập địa điểm"
          />
        </SearchField>

        {/* Check-in Date */}
        <SearchField label="Nhận phòng" icon={Calendar}>
          <input
            type="date"
            value={searchData.checkIn}
            min={today}
            onChange={(e) => setSearchData({ ...searchData, checkIn: e.target.value })}
            className="w-full pl-11 pr-4 py-3 bg-secondary border-2 border-border rounded-lg
              text-foreground
              focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
              transition-all duration-200"
          />
        </SearchField>

        {/* Check-out Date */}
        <SearchField label="Trả phòng" icon={Calendar}>
          <input
            type="date"
            value={searchData.checkOut}
            min={searchData.checkIn}
            onChange={(e) => setSearchData({ ...searchData, checkOut: e.target.value })}
            className="w-full pl-11 pr-4 py-3 bg-secondary border-2 border-border rounded-lg
              text-foreground
              focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
              transition-all duration-200"
          />
        </SearchField>

        {/* Rooms & Guests */}
        <SearchField label="Phòng & Khách" icon={Users}>
          <div className="relative">
            <select
              value={`${searchData.rooms}-${searchData.guests}`}
              onChange={(e) => {
                const [rooms, guests] = e.target.value.split('-').map(Number);
                setSearchData({ ...searchData, rooms, guests });
              }}
              className="w-full pl-11 pr-10 py-3 bg-secondary border-2 border-border rounded-lg
                text-foreground
                focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                appearance-none cursor-pointer transition-all duration-200"
            >
              <option value="1-2">1 Phòng - 2 Khách</option>
              <option value="1-4">1 Phòng - 4 Khách</option>
              <option value="2-4">2 Phòng - 4 Khách</option>
              <option value="2-6">2 Phòng - 6 Khách</option>
              <option value="3-6">3 Phòng - 6 Khách</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={18} />
          </div>
        </SearchField>

        {/* Search Button */}
        <div className="flex items-end">
          <Button
            type="submit"
            className="w-full lg:text-base font-semibold"
          >
            Tìm phòng
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SearchBox;
