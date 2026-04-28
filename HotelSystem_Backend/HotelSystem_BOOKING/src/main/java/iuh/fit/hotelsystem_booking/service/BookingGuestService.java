package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.dto.GuestRequest;
import iuh.fit.hotelsystem_booking.entity.BookingGuest;
import iuh.fit.hotelsystem_booking.entity.GuestType;
import iuh.fit.hotelsystem_booking.repository.BookingGuestRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class BookingGuestService {

    private final BookingGuestRepository guestRepository;

    public BookingGuestService(BookingGuestRepository guestRepository) {
        this.guestRepository = guestRepository;
    }

    public List<BookingGuest> validateAndBuildGuests(GuestRequest primaryGuest,
                                                     List<GuestRequest> guestRequests,
                                                     LocalDate checkIn,
                                                     Integer guestCount,
                                                     Integer roomCapacitySnapshot) {
        if (primaryGuest == null) {
            throw new IllegalArgumentException("Người nhận phòng phải từ 18 tuổi trở lên và có số điện thoại liên hệ.");
        }

        List<GuestRequest> merged = new ArrayList<>();
        GuestRequest primary = copyPrimary(primaryGuest);
        merged.add(primary);
        if (guestRequests != null) {
            for (GuestRequest request : guestRequests) {
                if (request != null && !sameGuest(primary, request)) {
                    merged.add(request);
                }
            }
        }

        int requestedGuestCount = guestCount != null && guestCount > 0 ? guestCount : merged.size();
        if (roomCapacitySnapshot != null && roomCapacitySnapshot > 0 && requestedGuestCount > roomCapacitySnapshot) {
            throw new IllegalArgumentException("Số khách vượt quá sức chứa của phòng.");
        }

        List<BookingGuest> guests = new ArrayList<>();
        boolean hasAdult = false;
        for (GuestRequest request : merged) {
            BookingGuest guest = toEntity(request, checkIn);
            if (Boolean.TRUE.equals(guest.getPrimaryGuest())) {
                validatePrimaryGuest(guest, checkIn);
            } else {
                validateCompanionGuest(guest);
            }
            hasAdult = hasAdult || guest.isAdultOn(checkIn);
            guests.add(guest);
        }

        if (!hasAdult) {
            throw new IllegalArgumentException("Booking phải có ít nhất 1 khách người lớn.");
        }
        return guests;
    }

    public List<BookingGuest> saveGuests(Long bookingId, List<BookingGuest> guests) {
        guests.forEach(guest -> guest.setBookingId(bookingId));
        return guestRepository.saveAll(guests);
    }

    public List<BookingGuest> getGuests(Long bookingId) {
        return guestRepository.findByBookingIdOrderByPrimaryGuestDescIdAsc(bookingId);
    }

    public BookingGuest updateGuest(Long bookingId, Long guestId, GuestRequest request) {
        BookingGuest guest = guestRepository.findByIdAndBookingId(guestId, bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Guest not found"));
        guest.setFullName(clean(request.getFullName()));
        guest.setDateOfBirth(request.getDateOfBirth());
        guest.setPhone(clean(request.getPhone()));
        guest.setEmail(clean(request.getEmail()));
        guest.setType(resolveType(request.getDateOfBirth(), LocalDate.now()));
        return guestRepository.save(guest);
    }

    private BookingGuest toEntity(GuestRequest request, LocalDate checkIn) {
        BookingGuest guest = new BookingGuest();
        guest.setFullName(clean(request.getFullName()));
        guest.setDateOfBirth(request.getDateOfBirth());
        guest.setPhone(clean(request.getPhone()));
        guest.setEmail(clean(request.getEmail()));
        guest.setPrimaryGuest(Boolean.TRUE.equals(request.getPrimary()));
        guest.setCheckInPerson(Boolean.TRUE.equals(request.getCheckInPerson()));
        guest.setType(resolveType(request.getDateOfBirth(), checkIn));
        return guest;
    }

    private void validatePrimaryGuest(BookingGuest guest, LocalDate checkIn) {
        if (isBlank(guest.getFullName()) || guest.getDateOfBirth() == null || isBlank(guest.getPhone())) {
            throw new IllegalArgumentException("Người nhận phòng phải từ 18 tuổi trở lên và có số điện thoại liên hệ.");
        }
        if (!guest.isAdultOn(checkIn)) {
            throw new IllegalArgumentException("Người nhận phòng phải từ 18 tuổi trở lên.");
        }
        guest.setCheckInPerson(true);
    }

    private void validateCompanionGuest(BookingGuest guest) {
        if (isBlank(guest.getFullName())) {
            throw new IllegalArgumentException("Tên khách lưu trú là bắt buộc.");
        }
        if (guest.getType() == GuestType.CHILD && guest.getDateOfBirth() == null) {
            throw new IllegalArgumentException("Trẻ em cần có ngày sinh.");
        }
    }

    private GuestType resolveType(LocalDate dateOfBirth, LocalDate checkIn) {
        if (dateOfBirth == null) {
            return GuestType.ADULT;
        }
        return java.time.Period.between(dateOfBirth, checkIn).getYears() >= 18 ? GuestType.ADULT : GuestType.CHILD;
    }

    private GuestRequest copyPrimary(GuestRequest input) {
        GuestRequest primary = new GuestRequest();
        primary.setFullName(input.getFullName());
        primary.setDateOfBirth(input.getDateOfBirth());
        primary.setPhone(input.getPhone());
        primary.setEmail(input.getEmail());
        primary.setPrimary(true);
        primary.setCheckInPerson(true);
        return primary;
    }

    private boolean sameGuest(GuestRequest primary, GuestRequest other) {
        return Boolean.TRUE.equals(other.getPrimary())
                || (clean(primary.getFullName()).equalsIgnoreCase(clean(other.getFullName()))
                && primary.getDateOfBirth() != null
                && primary.getDateOfBirth().equals(other.getDateOfBirth()));
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
