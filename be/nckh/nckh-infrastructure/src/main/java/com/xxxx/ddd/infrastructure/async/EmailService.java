package com.xxxx.ddd.infrastructure.async;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {
    private final JavaMailSender mailSender;

    public void sendInviteEmail(
            String to,
            String workspaceName,
            String inviterName
    ) throws MessagingException {

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setTo(to);
        helper.setSubject("You're invited to join a workspace");
        helper.setFrom("Workspace App <no-reply@workspace.com>");

        helper.setText("""
<table width="100%%" cellpadding="0" cellspacing="0"
       style="font-family:Arial,sans-serif;background:#f6f8fa;padding:30px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:8px;padding:30px;">
        <tr>
          <td style="font-size:18px;font-weight:bold;color:#333;">
            Workspace Invitation
          </td>
        </tr>
        <tr>
          <td style="padding-top:15px;font-size:14px;color:#555;">
            <b>%s</b> invited you to join the workspace <b>%s</b>.
          </td>
        </tr>
        <tr>
          <td style="padding-top:20px;font-size:14px;color:#555;">
            Please log in to the app to accept or decline this invitation.
          </td>
        </tr>
        <tr>
          <td style="padding-top:30px;font-size:12px;color:#999;text-align:center;">
            This invitation will expire in 3 days.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
""".formatted(inviterName, workspaceName), true);

        mailSender.send(message);
    }
}
