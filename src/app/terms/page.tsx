"use client";

import Link from "next/link";
import { GuestNavbar } from "@/components/guest/guest-navbar";
import { GuestFooter } from "@/components/guest/guest-footer";
import { useLanguage } from "@/context/language-context";

export default function TermsPage() {
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
            {isVi ? "Điều khoản Dịch vụ" : "Terms of Service"}
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
                ? "Bằng cách truy cập hoặc sử dụng HireGen AI, bạn đồng ý bị ràng buộc bởi các điều khoản này. Vui lòng đọc kỹ trước khi sử dụng dịch vụ."
                : "By accessing or using HireGen AI, you agree to be bound by these terms. Please read carefully before using the service."}
            </p>
          </section>

          <Section
            title={isVi ? "1. Chấp nhận Điều khoản" : "1. Acceptance of Terms"}
            body={isVi
              ? "Bằng cách tạo tài khoản hoặc sử dụng bất kỳ tính năng nào của HireGen AI, bạn xác nhận rằng bạn đã đọc, hiểu và đồng ý với các Điều khoản Dịch vụ này. Nếu bạn không đồng ý, vui lòng không sử dụng dịch vụ."
              : "By creating an account or using any features of HireGen AI, you confirm that you have read, understood, and agree to these Terms of Service. If you do not agree, please do not use the service."}
          />

          <Section
            title={isVi ? "2. Mô tả Dịch vụ" : "2. Description of Service"}
            body={isVi
              ? "HireGen AI là nền tảng tạo câu hỏi phỏng vấn được hỗ trợ bởi AI. Dịch vụ cho phép người dùng (HR/Nhà tuyển dụng) tải lên mô tả công việc để tự động tạo ra các bộ câu hỏi phỏng vấn phù hợp theo vai trò, cấp độ và kỹ năng."
              : "HireGen AI is an AI-powered interview question generation platform. The service allows users (HR/Recruiters) to upload job descriptions to automatically generate tailored interview question sets based on role, level, and skills."}
          />

          <Section
            title={isVi ? "3. Tài khoản Người dùng" : "3. User Accounts"}
            body={isVi
              ? "Bạn chịu trách nhiệm duy trì tính bảo mật của tài khoản và mật khẩu. Bạn đồng ý thông báo ngay cho chúng tôi về bất kỳ hành vi sử dụng trái phép nào. HireGen AI không chịu trách nhiệm về bất kỳ tổn thất nào phát sinh từ việc không bảo vệ thông tin đăng nhập của bạn."
              : "You are responsible for maintaining the security of your account and password. You agree to notify us immediately of any unauthorized use. HireGen AI is not liable for any losses arising from your failure to protect your login credentials."}
          />

          <Section
            title={isVi ? "4. Sử dụng Được Chấp nhận" : "4. Acceptable Use"}
            body={isVi
              ? "Bạn đồng ý không sử dụng dịch vụ để: (a) vi phạm bất kỳ luật hoặc quy định nào; (b) tải lên nội dung phân biệt đối xử, xúc phạm hoặc vi phạm quyền sở hữu trí tuệ; (c) cố gắng truy cập trái phép vào hệ thống; (d) phát tán phần mềm độc hại."
              : "You agree not to use the service to: (a) violate any laws or regulations; (b) upload discriminatory, offensive, or IP-infringing content; (c) attempt unauthorized access to systems; (d) distribute malware."}
          />

          <Section
            title={isVi ? "5. Nội dung Người dùng" : "5. User Content"}
            body={isVi
              ? "Bạn giữ toàn bộ quyền sở hữu đối với mô tả công việc và nội dung bạn tải lên. Bằng cách sử dụng dịch vụ, bạn cấp cho HireGen AI giấy phép giới hạn để xử lý nội dung đó nhằm cung cấp dịch vụ cho bạn. Chúng tôi không chia sẻ nội dung của bạn với bên thứ ba ngoài các nhà cung cấp AI phục vụ xử lý."
              : "You retain full ownership of job descriptions and content you upload. By using the service, you grant HireGen AI a limited license to process that content to provide the service to you. We do not share your content with third parties beyond AI providers used for processing."}
          />

          <Section
            title={isVi ? "6. Quyền Sở hữu Trí tuệ" : "6. Intellectual Property"}
            body={isVi
              ? "HireGen AI và tất cả nội dung, tính năng, chức năng của nó là tài sản của chúng tôi và được bảo hộ bởi luật sở hữu trí tuệ. Câu hỏi phỏng vấn được tạo ra cho tài khoản của bạn thuộc về bạn để sử dụng trong hoạt động tuyển dụng."
              : "HireGen AI and all its content, features, and functionality are our property and protected by intellectual property laws. Interview questions generated for your account belong to you for use in your recruitment activities."}
          />

          <Section
            title={isVi ? "7. Giới hạn Trách nhiệm" : "7. Limitation of Liability"}
            body={isVi
              ? "HireGen AI cung cấp dịch vụ \"như hiện có\". Chúng tôi không đảm bảo rằng các câu hỏi được tạo ra phù hợp cho mọi trường hợp tuyển dụng. Chúng tôi không chịu trách nhiệm về bất kỳ quyết định tuyển dụng nào dựa trên nội dung được tạo bởi AI."
              : "HireGen AI provides the service \"as is\". We do not warrant that generated questions are suitable for every hiring situation. We are not liable for any hiring decisions made based on AI-generated content."}
          />

          <Section
            title={isVi ? "8. Chấm dứt" : "8. Termination"}
            body={isVi
              ? "Chúng tôi có quyền đình chỉ hoặc chấm dứt tài khoản của bạn nếu bạn vi phạm các điều khoản này. Bạn cũng có thể xóa tài khoản bất kỳ lúc nào thông qua phần Cài đặt."
              : "We reserve the right to suspend or terminate your account if you violate these terms. You may also delete your account at any time through Settings."}
          />

          <Section
            title={isVi ? "9. Thay đổi Điều khoản" : "9. Changes to Terms"}
            body={isVi
              ? "Chúng tôi có thể cập nhật các điều khoản này theo thời gian. Chúng tôi sẽ thông báo các thay đổi quan trọng qua email hoặc thông báo trong ứng dụng. Việc tiếp tục sử dụng sau khi thay đổi đồng nghĩa với việc bạn chấp nhận điều khoản mới."
              : "We may update these terms from time to time. We will notify you of significant changes via email or in-app notification. Continued use after changes constitutes acceptance of the new terms."}
          />

          <Section
            title={isVi ? "10. Liên hệ" : "10. Contact"}
            body={isVi
              ? "Nếu bạn có bất kỳ câu hỏi nào về các Điều khoản này, vui lòng liên hệ: support@hiregen.ai"
              : "If you have any questions about these Terms, please contact: support@hiregen.ai"}
          />
        </div>

        {/* Footer nav */}
        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800 flex gap-4 text-sm">
          <Link href="/privacy" className="text-violet-600 dark:text-violet-400 hover:underline">
            {isVi ? "Chính sách Bảo mật" : "Privacy Policy"}
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
