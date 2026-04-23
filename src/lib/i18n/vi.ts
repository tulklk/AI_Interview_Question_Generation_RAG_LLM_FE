import type { Translations } from "./en";

export const vi: Translations = {
  common: {
    login: "Đăng nhập",
    getStarted: "Bắt đầu",
    logout: "Đăng xuất",
    tryFree: "Dùng miễn phí",
  },

  nav: {
    home: "Trang chủ",
    features: "Tính năng",
    pricing: "Bảng giá",
    contact: "Liên hệ",
  },

  hero: {
    badge: "Được hỗ trợ bởi RAG + Mô hình Ngôn ngữ Lớn",
    headline1: "Tạo Câu Hỏi Phỏng Vấn",
    headline2: "từ",
    headlineGradient: "Mô Tả Công Việc",
    headline3: "bằng AI",
    subtext:
      "Dán bất kỳ mô tả công việc nào và nhận câu hỏi phỏng vấn Kỹ thuật, Hành vi và Tình huống phù hợp trong vài giây — được hỗ trợ bởi RAG và GPT-4.",
    point1: "Tiết kiệm thời gian tuyển dụng",
    point2: "Câu hỏi theo ngữ cảnh",
    point3: "Xuất PDF sẵn sàng",
    ctaPrimary: "Dùng miễn phí",
    ctaSecondary: "Đăng nhập",
    mockupTitle: "InterviewAI — Trình tạo câu hỏi",
    mockupJdLabel: "Mô tả công việc",
    mockupJdText:
      "Chúng tôi đang tìm kiếm một Lập trình viên Frontend Senior với hơn 5 năm kinh nghiệm về React và TypeScript. Yêu cầu hiểu sâu về Next.js, SSR và tối ưu hiệu suất...",
    mockupKeywordsLabel: "Từ khóa trích xuất",
    mockupAiLabel: "Gợi ý trả lời từ AI",
    mockupQuestion:
      "Giải thích sự khác biệt giữa SSR và SSG trong Next.js và khi nào nên chọn mỗi loại?",
    mockupAnswer:
      "SSR render theo từng yêu cầu — lý tưởng cho dữ liệu động. SSG render trước lúc build để tối đa hiệu suất. Lựa chọn dựa trên yêu cầu về độ tươi của dữ liệu...",
  },

  benefits: {
    sectionLabel: "Tại sao chọn InterviewAI",
    headline: "Được xây dựng cho đội tuyển dụng hiện đại",
    subtext:
      "Tất cả những gì bạn cần để thực hiện những buổi phỏng vấn nhất quán, toàn diện — mà không mất hàng giờ chuẩn bị.",
    items: [
      {
        title: "Nhanh hơn 10 lần",
        description:
          "Tạo bộ câu hỏi phỏng vấn đầy đủ từ bất kỳ mô tả công việc nào trong vòng 30 giây. Không còn phải viết câu hỏi thủ công.",
      },
      {
        title: "AI hiểu ngữ cảnh",
        description:
          "Truy xuất dữ liệu bằng RAG giúp mỗi câu hỏi được đặt nền tảng trên kỹ năng thực tế và kiến thức ngành nghề từ mô tả công việc.",
      },
      {
        title: "Đánh giá nhất quán",
        description:
          "Các danh mục Kỹ thuật, Hành vi và Tình huống có cấu trúc đảm bảo mỗi buổi phỏng vấn bao quát toàn diện hồ sơ ứng viên.",
      },
      {
        title: "Xuất file ngay lập tức",
        description:
          "Tải bộ câu hỏi dạng PDF hoặc DOCX, chia sẻ với đồng nghiệp hoặc lưu vào lịch sử phiên làm việc.",
      },
    ],
  },

  features: {
    sectionLabel: "Tính năng nền tảng",
    headline: "Tất cả những gì bạn cần để tuyển dụng thông minh hơn",
    subtext:
      "Từ phân tích mô tả công việc đến bộ câu hỏi sẵn sàng xuất, mọi tính năng đều được thiết kế để tiết kiệm thời gian và nâng cao chất lượng phỏng vấn.",
    items: [
      {
        title: "Nhập mô tả công việc",
        description:
          "Dán bất kỳ mô tả công việc hoặc tải file PDF/DOCX. AI tự động phân tích vị trí, kỹ năng yêu cầu và cấp độ kinh nghiệm.",
      },
      {
        title: "AI trích xuất kỹ năng",
        description:
          "Hệ thống xác định các năng lực cốt lõi, công nghệ và kỹ năng mềm từ mô tả công việc bằng xử lý ngôn ngữ tự nhiên.",
      },
      {
        title: "Truy xuất kiến thức RAG",
        description:
          "Retrieval-Augmented Generation thu thập kiến thức liên quan từ các nguồn được chọn lọc để đặt nền tảng cho câu hỏi trên chuyên môn thực tế.",
      },
      {
        title: "Tạo câu hỏi tự động",
        description:
          "Tạo câu hỏi Kỹ thuật, Hành vi và Tình huống phù hợp với cấp độ kinh nghiệm và lĩnh vực chuyên môn.",
      },
      {
        title: "Gợi ý câu trả lời",
        description:
          "Mỗi câu hỏi đi kèm một gợi ý trả lời được AI tạo ra để giúp người đánh giá đối chiếu câu trả lời của ứng viên.",
      },
      {
        title: "Lịch sử & Xuất file",
        description:
          "Truy cập tất cả phiên làm việc trước đây từ bảng lịch sử. Xuất sang PDF hoặc DOCX để sử dụng trong phỏng vấn bất cứ lúc nào.",
      },
    ],
  },

  workflow: {
    sectionLabel: "Cách thức hoạt động",
    headline: "Từ mô tả công việc đến sẵn sàng phỏng vấn trong 4 bước",
    subtext:
      "Một quy trình đơn giản, mạnh mẽ biến bất kỳ mô tả công việc nào thành bộ câu hỏi phỏng vấn có cấu trúc.",
    steps: [
      {
        title: "Nhập mô tả công việc",
        description:
          "Dán nội dung mô tả công việc hoặc tải file PDF/DOCX trực tiếp vào nền tảng.",
      },
      {
        title: "Trích xuất kỹ năng",
        description:
          "AI xác định các kỹ năng yêu cầu, công nghệ và cấp độ kinh nghiệm từ mô tả công việc.",
      },
      {
        title: "Truy xuất kiến thức",
        description:
          "RAG thu thập kiến thức liên quan từ các nguồn được chọn lọc để đặt nền tảng cho mỗi câu hỏi.",
      },
      {
        title: "Tạo câu hỏi",
        description:
          "Nhận bộ câu hỏi được phân loại gồm Kỹ thuật, Hành vi và Tình huống ngay lập tức.",
      },
    ],
  },

  pricing: {
    sectionLabel: "Bảng giá",
    headline: "Bảng giá đơn giản, minh bạch",
    subtext:
      "Bắt đầu miễn phí. Nâng cấp khi bạn sẵn sàng. Hủy bất cứ lúc nào.",
    mostPopular: "Phổ biến nhất",
    plans: [
      {
        name: "Miễn phí",
        period: "/ tháng",
        description: "Dành cho sinh viên và khám phá cơ bản nền tảng.",
        cta: "Bắt đầu miễn phí",
        features: [
          "5 lần tạo câu hỏi mỗi tháng",
          "Tạo câu hỏi cơ bản",
          "Chỉ câu hỏi kỹ thuật",
          "Xuất file giới hạn (3 lần/tháng)",
          "Hỗ trợ cộng đồng",
          "Câu hỏi hành vi & tình huống",
          "Gợi ý câu trả lời",
          "Theo dõi lịch sử",
        ],
      },
      {
        name: "Chuyên nghiệp",
        period: "/ tháng",
        description:
          "Dành cho nhà tuyển dụng và nhóm nhỏ cần đầy đủ tính năng.",
        cta: "Đăng ký gói Pro",
        features: [
          "100 lần tạo câu hỏi mỗi tháng",
          "Kỹ thuật, Hành vi & Tình huống",
          "Gợi ý câu trả lời từ AI",
          "Xuất PDF không giới hạn",
          "Toàn bộ lịch sử phiên làm việc",
          "Hỗ trợ email ưu tiên",
          "Quản lý nhóm",
          "Bảng phân tích Admin",
        ],
      },
      {
        name: "Doanh nghiệp",
        period: "Liên hệ",
        description:
          "Dành cho tổ chức cần quy mô lớn, kiểm soát và hỗ trợ tận tình.",
        cta: "Liên hệ tư vấn",
        features: [
          "Tạo câu hỏi không giới hạn",
          "Bao gồm tất cả tính năng Pro",
          "Quản lý nhóm & vai trò",
          "Bảng phân tích Admin",
          "Kiểm soát truy cập theo vai trò",
          "Quản lý tài khoản chuyên dụng",
          "Cấu hình mô hình AI tùy chỉnh",
          "Tùy chọn triển khai tại chỗ",
        ],
      },
    ],
  },

  demo: {
    sectionLabel: "Demo trực tiếp",
    headline: "Xem thực tế",
    subtext:
      "Đây là ví dụ thực tế về những gì InterviewAI tạo ra từ mô tả công việc Lập trình viên Frontend Senior.",
    jobTitle: "Lập trình viên Frontend Senior",
    generatedFor: "Được tạo cho · Tech Corp Inc.",
    questionsCount: "câu hỏi",
    categories: {
      Technical: "Kỹ thuật",
      Behavioral: "Hành vi",
      Situational: "Tình huống",
    },
    showAnswer: "Xem gợi ý trả lời",
    hideAnswer: "Ẩn gợi ý trả lời",
    aiAnswerLabel: "Gợi ý từ AI",
    difficulty: {
      Easy: "Dễ",
      Medium: "Trung bình",
      Hard: "Khó",
    },
    questions: {
      t1: {
        question:
          "Giải thích sự khác biệt giữa Server-Side Rendering (SSR) và Static Site Generation (SSG) trong Next.js, và khi nào nên chọn mỗi loại?",
        suggestedAnswer:
          "SSR render trang theo từng yêu cầu tại server, lý tưởng cho dữ liệu động. SSG render trước lúc build, phù hợp nhất cho nội dung ít thay đổi. Chọn SSR khi độ tươi của dữ liệu là ưu tiên; chọn SSG khi hiệu suất và CDN caching là yếu tố quan trọng.",
      },
      t2: {
        question:
          "Làm thế nào để tối ưu hiệu suất của ứng dụng React render danh sách lớn?",
        suggestedAnswer:
          "Sử dụng ảo hóa (react-window hoặc react-virtual), ghi nhớ với React.memo và useMemo, tải chậm với Suspense, và phân trang hoặc cuộn vô hạn để tránh mount tất cả items cùng lúc.",
      },
      b1: {
        question:
          "Mô tả một lần bạn phải giao tính năng trong điều kiện deadline gấp. Bạn đã ưu tiên như thế nào và kết quả ra sao?",
        suggestedAnswer:
          "Tìm kiếm bằng chứng về đàm phán phạm vi, giao tiếp rõ ràng với các bên liên quan, chia nhỏ vấn đề thành các phần có thể giao được, và suy ngẫm về những gì họ sẽ làm khác đi.",
      },
      b2: {
        question:
          "Kể về một tình huống bạn không đồng ý với quyết định kỹ thuật của trưởng nhóm. Bạn đã xử lý như thế nào?",
        suggestedAnswer:
          "Ứng viên mạnh sẽ cho thấy họ đã nêu lo ngại một cách xây dựng với dữ liệu/lý luận, lắng nghe quan điểm của nhóm, và có thể chấp nhận quyết định một cách graceful hoặc tác động để đạt kết quả tốt hơn.",
      },
      s1: {
        question:
          "Bạn đang giữa sprint và phát hiện ra một dependency cốt lõi có lỗ hổng bảo mật nghiêm trọng. Bạn sẽ xử lý như thế nào?",
        suggestedAnswer:
          "Đánh giá ngay tác động, thông báo cho nhóm và các bên liên quan về bảo mật, đánh giá các tùy chọn vá lỗi hoặc giải pháp thay thế, thông báo tác động đến timeline cho product, và ghi lại sự cố để retrospective.",
      },
      s2: {
        question:
          "Nhóm của bạn được yêu cầu tích hợp một API bên thứ ba có tài liệu kém. Bạn sẽ thực hiện các bước nào để đảm bảo tích hợp đáng tin cậy?",
        suggestedAnswer:
          "Khám phá môi trường sandbox, viết test thử nghiệm, liên hệ nhà cung cấp để làm rõ, thêm xử lý lỗi mạnh mẽ và logic retry, đồng thời ghi lại đầy đủ các giả định tích hợp của bạn.",
      },
    },
  },

  testimonials: {
    sectionLabel: "Đánh giá khách hàng",
    headline: "Được tin dùng bởi nhà tuyển dụng và giảng viên",
    subtext:
      "Xem những gì các chuyên gia nói về cách InterviewAI đã thay đổi quy trình tuyển dụng và đánh giá của họ.",
    items: [
      {
        quote:
          "InterviewAI đã giảm thời gian chuẩn bị phỏng vấn của chúng tôi hơn 80%. Các câu hỏi thực sự được tùy chỉnh cho từng vai trò — như có một nhà tuyển dụng senior theo yêu cầu.",
        name: "Sarah Kim",
        role: "Trưởng bộ phận tuyển dụng",
        company: "Meta",
      },
      {
        quote:
          "Là một tech lead tham gia nhiều hội đồng phỏng vấn, chất lượng câu hỏi Kỹ thuật rất ấn tượng. Chúng khớp chính xác với các kỹ năng trong mô tả công việc.",
        name: "James Liu",
        role: "Quản lý kỹ thuật cấp cao",
        company: "Stripe",
      },
      {
        quote:
          "Tôi dùng công cụ này cho các hội đồng đánh giá tại trường đại học. Nó tạo ra đúng loại câu hỏi có cấu trúc để đánh giá cả năng lực kỹ thuật và kỹ năng mềm.",
        name: "TS. Emily Trần",
        role: "Giảng viên, Khoa học máy tính",
        company: "Đại học FPT",
      },
    ],
  },

  cta: {
    badge: "Không cần thẻ tín dụng",
    headline: "Bắt đầu tạo buổi phỏng vấn tốt hơn ngay hôm nay",
    subtext:
      "Tham gia cùng hàng trăm nhà tuyển dụng và giảng viên đang sử dụng InterviewAI để xây dựng quy trình phỏng vấn thông minh hơn, nhanh hơn và nhất quán hơn.",
    primary: "Bắt đầu miễn phí",
    secondary: "Đăng nhập vào tài khoản",
  },

  footer: {
    tagline:
      "Tạo câu hỏi phỏng vấn bằng AI từ mô tả công việc. Được xây dựng với RAG và LLM để giúp nhà tuyển dụng và giảng viên tiết kiệm thời gian và tuyển dụng tốt hơn.",
    quickLinks: "Liên kết nhanh",
    legal: "Pháp lý",
    privacy: "Chính sách bảo mật",
    terms: "Điều khoản dịch vụ",
    cookies: "Chính sách Cookie",
    builtWith: "Được xây dựng với Next.js, TypeScript & TailwindCSS",
    copyright: "Bảo lưu mọi quyền.",
  },

  sidebar: {
    subtitle: "Trình tạo câu hỏi",
    sectionLabel: "Menu chính",
    nav: {
      "/dashboard": "Bảng điều khiển",
      "/generate": "Tạo câu hỏi",
      "/history": "Lịch sử",
      "/settings": "Cài đặt",
    },
    quickGenerate: {
      title: "Tạo nhanh",
      desc: "Dán mô tả công việc và nhận câu hỏi trong 30 giây",
      btn: "Bắt đầu →",
    },
    logoutTitle: "Đăng xuất",
  },

  adminSidebar: {
    subtitle: "Bảng quản trị",
    sectionLabel: "Quản trị",
    nav: {
      "/admin/dashboard": "Bảng điều khiển",
      "/admin/users": "Quản lý người dùng",
      "/admin/analytics": "Phân tích",
      "/admin/content": "Nội dung đã tạo",
      "/admin/settings": "Cài đặt",
    },
    systemStatus: {
      title: "Trạng thái hệ thống",
      desc: "Tất cả dịch vụ hoạt động bình thường",
      online: "Trực tuyến",
    },
    logoutTitle: "Đăng xuất",
  },

  topHeader: {
    searchPlaceholder: "Tìm kiếm...",
  },

  appShell: {
    routes: {
      "/dashboard": "Bảng điều khiển",
      "/generate": "Tạo câu hỏi",
      "/history": "Lịch sử phiên làm việc",
      "/settings": "Cài đặt",
      "/admin/dashboard": "Bảng điều khiển Admin",
      "/admin/users": "Quản lý người dùng",
      "/admin/analytics": "Phân tích hệ thống",
      "/admin/content": "Nội dung đã tạo",
      "/admin/settings": "Cài đặt Admin",
    },
    breadcrumb: {
      dashboard: "Bảng điều khiển",
      generate: "Tạo câu hỏi",
      history: "Lịch sử",
      results: "Kết quả",
      settings: "Cài đặt",
      admin: "Admin",
      users: "Người dùng",
      analytics: "Phân tích",
      content: "Nội dung",
    },
  },

  lang: {
    label: "Ngôn ngữ",
  },
};
