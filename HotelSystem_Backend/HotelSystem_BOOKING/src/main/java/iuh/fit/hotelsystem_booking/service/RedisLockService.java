package iuh.fit.hotelsystem_booking.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Collections;
import java.util.UUID;

@Service
public class RedisLockService {

    private static final DefaultRedisScript<Long> UNLOCK_SCRIPT = new DefaultRedisScript<>(
            "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
            Long.class
    );

    private final StringRedisTemplate redisTemplate;

    public RedisLockService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public String tryAcquire(String key, Duration waitTimeout, Duration leaseTimeout) {
        String token = UUID.randomUUID().toString();
        long deadline = System.currentTimeMillis() + waitTimeout.toMillis();

        do {
            Boolean ok = redisTemplate.opsForValue().setIfAbsent(key, token, leaseTimeout);
            if (Boolean.TRUE.equals(ok)) {
                return token;
            }
            try {
                Thread.sleep(40L);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return null;
            }
        } while (System.currentTimeMillis() < deadline);

        return null;
    }

    public void release(String key, String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        redisTemplate.execute(UNLOCK_SCRIPT, Collections.singletonList(key), token);
    }
}
