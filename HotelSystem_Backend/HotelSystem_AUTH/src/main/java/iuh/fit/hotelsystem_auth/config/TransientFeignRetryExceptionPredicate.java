package iuh.fit.hotelsystem_auth.config;

import feign.FeignException;
import feign.RetryableException;

import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.util.concurrent.TimeoutException;
import java.util.function.Predicate;

import org.springframework.web.server.ResponseStatusException;

public class TransientFeignRetryExceptionPredicate implements Predicate<Throwable> {

    @Override
    public boolean test(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof RetryableException
                    || current instanceof SocketTimeoutException
                    || current instanceof ConnectException
                    || current instanceof TimeoutException) {
                return true;
            }

            if (current instanceof FeignException feignException) {
                int status = feignException.status();
                return status == 502 || status == 503 || status == 504;
            }

            if (current instanceof ResponseStatusException statusException) {
                int status = statusException.getStatusCode().value();
                return status == 502 || status == 503 || status == 504;
            }

            current = current.getCause();
        }

        return false;
    }
}
