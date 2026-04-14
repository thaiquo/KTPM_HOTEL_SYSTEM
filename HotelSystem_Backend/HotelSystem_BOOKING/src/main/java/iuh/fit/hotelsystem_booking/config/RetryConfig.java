package iuh.fit.hotelsystem_booking.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.backoff.FixedBackOffPolicy;
import org.springframework.retry.policy.SimpleRetryPolicy;
import org.springframework.retry.support.RetryTemplate;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeoutException;

@Configuration
public class RetryConfig {

	@Bean
	public RetryTemplate roomServiceRetryTemplate(
			@Value("${room.service.retry.max-attempts:3}") int maxAttempts,
			@Value("${room.service.retry.backoff-ms:1000}") long backoffMs
	) {
		Map<Class<? extends Throwable>, Boolean> retryable = new HashMap<>();
		retryable.put(WebClientRequestException.class, true);
		retryable.put(WebClientResponseException.class, true);
		retryable.put(TimeoutException.class, true);

		// traverseCauses=true so wrapped TimeoutException (e.g., Reactor timeout)
		// is still considered retryable.
		SimpleRetryPolicy retryPolicy = new SimpleRetryPolicy(maxAttempts, retryable, true);

		FixedBackOffPolicy backOffPolicy = new FixedBackOffPolicy();
		backOffPolicy.setBackOffPeriod(Math.max(0, backoffMs));

		RetryTemplate template = new RetryTemplate();
		template.setRetryPolicy(retryPolicy);
		template.setBackOffPolicy(backOffPolicy);
		return template;
	}
}
