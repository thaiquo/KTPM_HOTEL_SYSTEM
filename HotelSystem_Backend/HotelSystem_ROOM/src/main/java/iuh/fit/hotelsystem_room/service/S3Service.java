package iuh.fit.hotelsystem_room.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.UUID;

@Service
public class S3Service {

    private final S3Client s3Client;
    private final String bucketName;
    private final String region;

    public S3Service(@Value("${aws.accessKeyId}") String accessKey,
                     @Value("${aws.secretAccessKey}") String secretKey,
                     @Value("${aws.region}") String region,
                     @Value("${aws.s3.bucket}") String bucketName) {
        this.bucketName = bucketName;
        this.region = region;
        this.s3Client = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .build();
    }

    public String uploadFile(MultipartFile file) throws IOException {
        String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        return uploadToS3(fileName, file.getInputStream(), file.getSize(), file.getContentType());
    }

    /**
     * Upload an image from a URL to S3 with a specific key, 
     * but ONLY if it doesn't already exist.
     */
    public String uploadFromUrl(String imageUrl, String key) {
        try {
            // Kiểm tra xem file đã tồn tại trên S3 chưa
            if (doesObjectExist(key)) {
                return String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, key);
            }

            URL url = new URL(imageUrl);
            try (InputStream is = url.openStream()) {
                byte[] bytes = is.readAllBytes();
                return uploadToS3(key, new java.io.ByteArrayInputStream(bytes), (long) bytes.length, "image/jpeg");
            }
        } catch (Exception e) {
            System.err.println("Failed to upload from URL: " + imageUrl + ". Error: " + e.getMessage());
            return imageUrl; // Fallback to original URL if upload fails
        }
    }

    private boolean doesObjectExist(String key) {
        try {
            s3Client.headObject(software.amazon.awssdk.services.s3.model.HeadObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build());
            return true;
        } catch (software.amazon.awssdk.services.s3.model.S3Exception e) {
            if (e.statusCode() == 404) {
                return false;
            }
            throw e;
        }
    }

    private String uploadToS3(String fileName, InputStream inputStream, Long contentLength, String contentType) {
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(fileName)
                .contentType(contentType)
                .build();

        s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(inputStream, contentLength));

        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, fileName);
    }
}
