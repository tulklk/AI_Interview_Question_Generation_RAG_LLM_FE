"use client";

import Link from "next/link";
import { GuestNavbar } from "@/features/guest/components/guest-navbar";
import { GuestFooter } from "@/features/guest/components/guest-footer";
import { useLanguage } from "@/shared/providers/language-context";

export default function PrivacyPage() {
  const { lang } = useLanguage();
  const isVi = lang === "vi";

  const lastUpdated = "29/06/2026";

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950">
      <GuestNavbar />

      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-10">
          <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">
            {isVi ? "Pháp lý" : "Legal"}
          </p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            {isVi ? "Chính sách Bảo mật" : "Privacy Policy"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isVi ? `Cập nhật lần cuối: ${lastUpdated}` : `Last updated: ${lastUpdated}`}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-gray dark:prose-invert max-w-none text-[15px] leading-7 space-y-8">

          <section>
            <p className="text-gray-600 dark:text-gray-300">
              {isVi
                ? "HireGen AI cam kết bảo vệ thông tin cá nhân của bạn. Chính sách này mô tả cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu của bạn khi sử dụng nền tảng."
                : "HireGen AI is committed to protecting your personal information. This policy describes how we collect, use, and protect your data when using the platform."}
            </p>
          </section>

          <Section
            title={isVi ? "1. Thông tin Chúng tôi Thu thập" : "1. Information We Collect"}
            body={isVi
              ? "Chúng tôi thu thập: (a) Thông tin tài khoản: họ tên, địa chỉ email, mật khẩu đã mã hóa; (b) Nội dung bạn tải lên: mô tả công việc, ghi chú HR; (c) Dữ liệu sử dụng: nhật ký truy cập, tính năng đã dùng, thống kê phiên; (d) Thông tin thiết bị: loại trình duyệt, địa chỉ IP."
              : "We collect: (a) Account information: full name, email address, encrypted password; (b) Content you upload: job descriptions, HR notes; (c) Usage data: access logs, features used, session statistics; (d) Device information: browser type, IP address."}
          />

          <Section
            title={isVi ? "2. Cách Chúng tôi Sử dụng Thông tin" : "2. How We Use Your Information"}
            body={isVi
              ? "Chúng tôi sử dụng dữ liệu của bạn để: cung cấp và cải thiện dịch vụ tạo câu hỏi phỏng vấn; xác thực danh tính và bảo mật tài khoản; gửi thông báo quan trọng về dịch vụ; phân tích và nâng cao hiệu suất hệ thống."
              : "We use your data to: provide and improve the interview question generation service; authenticate identity and secure accounts; send important service notifications; analyze and improve system performance."}
          />

          <Section
            title={isVi ? "3. Chia sẻ Dữ liệu" : "3. Data Sharing"}
            body={isVi
              ? "Chúng tôi không bán thông tin cá nhân của bạn. Chúng tôi chỉ chia sẻ dữ liệu với: (a) Nhà cung cấp AI (OpenAI/tương đương) để xử lý tạo câu hỏi — chỉ nội dung JD bạn gửi; (b) Nhà cung cấp hạ tầng đám mây; (c) Khi pháp luật yêu cầu."
              : "We do not sell your personal information. We only share data with: (a) AI providers (OpenAI/equivalent) for question generation processing — only the JD content you submit; (b) Cloud infrastructure providers; (c) When required by law."}
          />

          <Section
            title={isVi ? "4. Bảo mật Dữ liệu" : "4. Data Security"}
            body={isVi
              ? "Chúng tôi áp dụng các biện pháp bảo mật kỹ thuật và tổ chức phù hợp, bao gồm: mã hóa dữ liệu khi truyền tải (TLS/HTTPS), mã hóa mật khẩu bằng bcrypt, kiểm soát truy cập theo vai trò, và giám sát bảo mật liên tục."
              : "We implement appropriate technical and organizational security measures, including: data encryption in transit (TLS/HTTPS), bcrypt password hashing, role-based access control, and continuous security monitoring."}
          />

          <Section
            title={isVi ? "5. Lưu trữ Dữ liệu" : "5. Data Retention"}
            body={isVi
              ? "Dữ liệu tài khoản được lưu trữ trong suốt thời gian tài khoản của bạn còn hoạt động. Nội dung tạo câu hỏi được lưu trong 24 tháng. Sau khi bạn xóa tài khoản, chúng tôi sẽ xóa dữ liệu cá nhân trong vòng 30 ngày."
              : "Account data is stored for as long as your account is active. Generated question content is retained for 24 months. After you delete your account, we will delete personal data within 30 days."}
          />

          <Section
            title={isVi ? "6. Quyền của Bạn" : "6. Your Rights"}
            body={isVi
              ? "Bạn có quyền: truy cập dữ liệu cá nhân của mình; yêu cầu sửa đổi thông tin không chính xác; yêu cầu xóa tài khoản và dữ liệu; xuất dữ liệu của bạn. Bạn có thể thực hiện các quyền này trong phần Cài đặt tài khoản."
              : "You have the right to: access your personal data; request correction of inaccurate information; request account and data deletion; export your data. You can exercise these rights in Account Settings."}
          />

          <Section
            title={isVi ? "7. Cookie" : "7. Cookies"}
            body={isVi
              ? "Chúng tôi sử dụng cookie cần thiết để duy trì phiên đăng nhập và sở thích ngôn ngữ. Chúng tôi không sử dụng cookie theo dõi bên thứ ba cho mục đích quảng cáo."
              : "We use necessary cookies to maintain login sessions and language preferences. We do not use third-party tracking cookies for advertising purposes."}
          />

          <Section
            title={isVi ? "8. Dữ liệu Trẻ em" : "8. Children's Data"}
            body={isVi
              ? "Dịch vụ của chúng tôi không dành cho người dưới 18 tuổi. Chúng tôi không cố ý thu thập thông tin cá nhân của trẻ em. Nếu bạn phát hiện tài khoản của trẻ em, vui lòng liên hệ chúng tôi ngay."
              : "Our service is not intended for users under 18. We do not knowingly collect personal information from minors. If you discover a minor's account, please contact us immediately."}
          />

          <Section
            title={isVi ? "9. Thay đổi Chính sách" : "9. Policy Changes"}
            body={isVi
              ? "Chúng tôi có thể cập nhật chính sách này theo thời gian để phản ánh các thay đổi trong thực tiễn hoặc luật pháp. Chúng tôi sẽ thông báo các thay đổi quan trọng ít nhất 30 ngày trước khi có hiệu lực."
              : "We may update this policy from time to time to reflect changes in practices or law. We will notify you of significant changes at least 30 days before they take effect."}
          />

          <Section
            title={isVi ? "10. Liên hệ" : "10. Contact"}
            body={isVi
              ? "Để thực hiện quyền của bạn hoặc nếu có bất kỳ câu hỏi nào về chính sách bảo mật, vui lòng liên hệ: privacy@hiregen.ai"
              : "To exercise your rights or if you have any questions about this privacy policy, please contact: privacy@hiregen.ai"}
          />
        </div>

        {/* Footer nav */}
        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800 flex gap-4 text-sm">
          <Link href="/terms" className="text-violet-600 dark:text-violet-400 hover:underline">
            {isVi ? "Điều khoản Dịch vụ" : "Terms of Service"}
          </Link>
          <Link href="/login" className="text-gray-500 dark:text-gray-400 hover:underline">
            {isVi ? "Quay lại Đăng nhập" : "Back to Login"}
          </Link>
        </div>
      </div>

      <GuestFooter />
    </main>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h2>
      <p className="text-gray-600 dark:text-gray-300">{body}</p>
    </section>
  );
}
