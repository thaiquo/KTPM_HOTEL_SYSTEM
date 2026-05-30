package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.dto.GuestRequest;
import iuh.fit.hotelsystem_booking.entity.BookingGuest;
import iuh.fit.hotelsystem_booking.repository.BookingGuestRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class BookingGuestServiceTest {

    private final BookingGuestService service = new BookingGuestService(mock(BookingGuestRepository.class));

    @Test
    void primaryGuestMustBeAdultAndHavePhone() {
        GuestRequest primary = guest("Nguyen Van A", LocalDate.now().minusYears(17), "0901234567", true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.validateAndBuildGuests(primary, List.of(), LocalDate.now(), 1, 2));

        assertTrue(ex.getMessage().contains("18"));
    }

    @Test
    void bookingRequiresAtLeastOneAdult() {
        GuestRequest primary = guest("Child", LocalDate.now().minusYears(10), "0901234567", true);

        assertThrows(IllegalArgumentException.class,
                () -> service.validateAndBuildGuests(primary, List.of(), LocalDate.now(), 1, 2));
    }

    @Test
    void guestCountCannotExceedRoomCapacity() {
        GuestRequest primary = guest("Nguyen Van A", LocalDate.now().minusYears(25), "0901234567", true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.validateAndBuildGuests(primary, List.of(), LocalDate.now(), 3, 2));

        assertTrue(ex.getMessage().contains("sức chứa"));
    }

    @Test
    void validPrimaryGuestBuildsAdultGuest() {
        GuestRequest primary = guest("Nguyen Van A", LocalDate.now().minusYears(25), "0901234567", true);

        List<BookingGuest> result = service.validateAndBuildGuests(primary, List.of(), LocalDate.now(), 1, 2);

        assertEquals(1, result.size());
        assertTrue(result.get(0).isAdultOn(LocalDate.now()));
        assertTrue(result.get(0).getCheckInPerson());
    }

    private GuestRequest guest(String name, LocalDate dob, String phone, boolean primary) {
        GuestRequest request = new GuestRequest();
        request.setFullName(name);
        request.setDateOfBirth(dob);
        request.setPhone(phone);
        request.setCccd("079204000001");
        request.setPrimary(primary);
        request.setCheckInPerson(primary);
        return request;
    }
}
