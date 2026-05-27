package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.dto.GuestRequest;
import iuh.fit.hotelsystem_booking.entity.BookingRoomGuestRole;
import iuh.fit.hotelsystem_booking.entity.BookingGuest;
import iuh.fit.hotelsystem_booking.entity.GuestType;
import iuh.fit.hotelsystem_booking.repository.BookingGuestRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class BookingGuestService {

    private static final Pattern PHONE_PATTERN = Pattern.compile("^(?:0\\d{9}|\\+?84\\d{9})$");
    private static final Pattern PASSPORT_PATTERN = Pattern.compile("^[A-Za-z0-9\\-]{5,20}$");

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

    public List<BookingGuest> validateAndBuildRoomGuests(List<GuestRequest> guestRequests,
                                                         Long roomId,
                                                         LocalDate checkIn,
                                                         Integer roomCapacitySnapshot) {
        if (guestRequests == null || guestRequests.isEmpty()) {
            throw new IllegalArgumentException("Mỗi phòng phải có ít nhất 1 khách đại diện.");
        }
        if (roomCapacitySnapshot != null && roomCapacitySnapshot > 0 && guestRequests.size() > roomCapacitySnapshot) {
            throw new IllegalArgumentException("Số khách vượt quá sức chứa của phòng " + roomId + ".");
        }

        List<BookingGuest> guests = new ArrayList<>();
        BookingGuest representative = null;
        for (GuestRequest request : guestRequests) {
            BookingGuest guest = toEntity(request, checkIn);
            guest.setRoomId(roomId);
            if (guest.getRole() == null) {
                guest.setRole(Boolean.TRUE.equals(guest.getPrimaryGuest())
                        ? BookingRoomGuestRole.REPRESENTATIVE
                        : BookingRoomGuestRole.MEMBER);
            }
            if (guest.getRole() == BookingRoomGuestRole.REPRESENTATIVE) {
                if (representative != null) {
                    throw new IllegalArgumentException("Mỗi phòng chỉ nên có 1 người đại diện. Phòng: " + roomId);
                }
                validateRepresentativeGuest(guest, checkIn, roomId);
                representative = guest;
            } else {
                validateCompanionGuest(guest);
            }
            guests.add(guest);
        }
        if (representative == null) {
            throw new IllegalArgumentException("Phòng " + roomId + " phải có ít nhất 1 người đại diện.");
        }
        return guests;
    }

    public List<BookingGuest> saveGuests(Long bookingId, List<BookingGuest> guests) {
        guests.forEach(guest -> guest.setBookingId(bookingId));
        return guestRepository.saveAll(guests);
    }

    public List<BookingGuest> saveRoomGuests(Long bookingId, Long bookingRoomId, List<BookingGuest> guests) {
        guests.forEach(guest -> {
            guest.setBookingId(bookingId);
            guest.setBookingRoomId(bookingRoomId);
        });
        return guestRepository.saveAll(guests);
    }

    public List<BookingGuest> getGuests(Long bookingId) {
        return guestRepository.findByBookingIdOrderByPrimaryGuestDescIdAsc(bookingId);
    }

    public List<BookingGuest> getGuestsByBookingRoom(Long bookingRoomId) {
        return guestRepository.findByBookingRoomIdOrderByPrimaryGuestDescIdAsc(bookingRoomId);
    }

    public BookingGuest updateGuest(Long bookingId, Long guestId, GuestRequest request) {
        BookingGuest guest = guestRepository.findByIdAndBookingId(guestId, bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Guest not found"));
        guest.setRoomId(request.getRoomId());
        guest.setFullName(clean(request.getFullName()));
        guest.setDateOfBirth(request.getDateOfBirth());
        guest.setPhone(clean(request.getPhone()));
        guest.setEmail(clean(request.getEmail()));
        guest.setCccd(clean(request.getCccd()));
        if (guest.getCccd().isBlank()) {
            guest.setCccd(clean(request.getCitizenId()));
        }
        guest.setPassport(clean(request.getPassport()));
        guest.setGender(clean(request.getGender()));
        guest.setNote(clean(request.getNote()));
        guest.setRole(resolveRole(request.getRole(), request.getPrimary()));
        guest.setType(resolveType(request.getDateOfBirth(), LocalDate.now()));
        return guestRepository.save(guest);
    }

    private BookingGuest toEntity(GuestRequest request, LocalDate checkIn) {
        BookingGuest guest = new BookingGuest();
        guest.setRoomId(request.getRoomId());
        guest.setFullName(clean(request.getFullName()));
        guest.setDateOfBirth(request.getDateOfBirth());
        guest.setPhone(clean(request.getPhone()));
        guest.setEmail(clean(request.getEmail()));
        guest.setCccd(clean(request.getCccd()));
        if (guest.getCccd().isBlank()) {
            guest.setCccd(clean(request.getCitizenId()));
        }
        guest.setPassport(clean(request.getPassport()));
        guest.setGender(clean(request.getGender()));
        guest.setNote(clean(request.getNote()));
        guest.setPrimaryGuest(Boolean.TRUE.equals(request.getPrimary()));
        guest.setCheckInPerson(Boolean.TRUE.equals(request.getCheckInPerson()));
        guest.setRole(resolveRole(request.getRole(), request.getPrimary()));
        guest.setType(resolveType(request.getDateOfBirth(), checkIn));
        return guest;
    }

    private void validateRepresentativeGuest(BookingGuest guest, LocalDate checkIn, Long roomId) {
        if (isBlank(guest.getFullName()) || guest.getDateOfBirth() == null || isBlank(guest.getPhone())) {
            throw new IllegalArgumentException("Người đại diện phòng " + roomId + " phải có họ tên, ngày sinh và số điện thoại.");
        }
        if (!guest.isAdultOn(checkIn)) {
            throw new IllegalArgumentException("Người đại diện phòng " + roomId + " phải từ 18 tuổi trở lên.");
        }
        if (!isValidPhone(guest.getPhone())) {
            throw new IllegalArgumentException("Số điện thoại người đại diện phòng " + roomId + " không hợp lệ.");
        }
        validateIdentityDocument(guest.getCccd(), guest.getPassport(), roomId);
        guest.setPrimaryGuest(true);
        guest.setCheckInPerson(true);
    }

    private void validatePrimaryGuest(BookingGuest guest, LocalDate checkIn) {
        if (isBlank(guest.getFullName()) || guest.getDateOfBirth() == null || isBlank(guest.getPhone())) {
            throw new IllegalArgumentException("Người nhận phòng phải từ 18 tuổi trở lên và có số điện thoại liên hệ.");
        }
        if (!guest.isAdultOn(checkIn)) {
            throw new IllegalArgumentException("Người nhận phòng phải từ 18 tuổi trở lên.");
        }
        if (!isValidPhone(guest.getPhone())) {
            throw new IllegalArgumentException("Số điện thoại người nhận phòng không hợp lệ.");
        }
        validateIdentityDocument(guest.getCccd(), guest.getPassport(), null);
        guest.setCheckInPerson(true);
    }

    private void validateCompanionGuest(BookingGuest guest) {
        if (isBlank(guest.getFullName())) {
            throw new IllegalArgumentException("Tên khách lưu trú là bắt buộc.");
        }
        if (!isBlank(guest.getPhone()) && !isValidPhone(guest.getPhone())) {
            throw new IllegalArgumentException("Số điện thoại khách đi cùng không hợp lệ.");
        }
        if (!isBlank(guest.getCccd()) || !isBlank(guest.getPassport())) {
            validateIdentityDocument(guest.getCccd(), guest.getPassport(), null);
        }
        if (guest.getType() == GuestType.CHILD && guest.getDateOfBirth() == null) {
            throw new IllegalArgumentException("Trẻ em cần có ngày sinh.");
        }
        if (guest.getDateOfBirth() != null && guest.ageOn(LocalDate.now()) < 0) {
            throw new IllegalArgumentException("Ngày sinh khách đi cùng không hợp lệ.");
        }
    }

    private GuestType resolveType(LocalDate dateOfBirth, LocalDate checkIn) {
        if (dateOfBirth == null) {
            return GuestType.ADULT;
        }
        return java.time.Period.between(dateOfBirth, checkIn).getYears() >= 18 ? GuestType.ADULT : GuestType.CHILD;
    }

    private BookingRoomGuestRole resolveRole(String role, Boolean primary) {
        if (role != null && !role.isBlank()) {
            return BookingRoomGuestRole.valueOf(role.trim().toUpperCase());
        }
        return Boolean.TRUE.equals(primary) ? BookingRoomGuestRole.REPRESENTATIVE : BookingRoomGuestRole.MEMBER;
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

    private boolean isValidPhone(String phone) {
        return !isBlank(phone) && PHONE_PATTERN.matcher(phone.trim()).matches();
    }

    private void validateIdentityDocument(String cccd, String passport, Long roomId) {
        String document = !isBlank(cccd) ? cccd.trim() : !isBlank(passport) ? passport.trim() : "";
        if (document.isBlank()) {
            throw new IllegalArgumentException(roomId != null
                    ? "Người đại diện phòng " + roomId + " phải có CCCD hoặc Passport."
                    : "Người đại diện phải có CCCD hoặc Passport.");
        }
        if (document.chars().allMatch(Character::isDigit) && document.length() != 12) {
            throw new IllegalArgumentException(roomId != null
                    ? "CCCD người đại diện phòng " + roomId + " phải đúng 12 chữ số."
                    : "CCCD phải đúng 12 chữ số.");
        }
        if (!document.chars().allMatch(Character::isDigit) && !PASSPORT_PATTERN.matcher(document).matches()) {
            throw new IllegalArgumentException(roomId != null
                    ? "Passport người đại diện phòng " + roomId + " không hợp lệ."
                    : "Passport không hợp lệ.");
        }
    }
}
