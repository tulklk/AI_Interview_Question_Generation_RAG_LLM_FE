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
    mockupTitle: "HireGen AI — Trình tạo câu hỏi",
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
    sectionLabel: "Tại sao chọn HireGen AI",
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
      "Đây là ví dụ thực tế về những gì HireGen AI tạo ra từ mô tả công việc Lập trình viên Frontend Senior.",
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
      "Xem những gì các chuyên gia nói về cách HireGen AI đã thay đổi quy trình tuyển dụng và đánh giá của họ.",
    items: [
      {
        quote:
          "HireGen AI đã giảm thời gian chuẩn bị phỏng vấn của chúng tôi hơn 80%. Các câu hỏi thực sự được tùy chỉnh cho từng vai trò — như có một nhà tuyển dụng senior theo yêu cầu.",
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
      "Tham gia cùng hàng trăm nhà tuyển dụng và giảng viên đang sử dụng HireGen AI để xây dựng quy trình phỏng vấn thông minh hơn, nhanh hơn và nhất quán hơn.",
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

  loginPage: {
    welcome: "Chào mừng trở lại",
    subtitle: "Đăng nhập vào tài khoản của bạn để tiếp tục",
    emailLabel: "Địa chỉ Email",
    emailPlaceholder: "ban@congty.com",
    passwordLabel: "Mật khẩu",
    forgotPassword: "Quên mật khẩu?",
    rememberMe: "Ghi nhớ đăng nhập trong 30 ngày",
    signIn: "Đăng nhập",
    orContinueWith: "hoặc tiếp tục với",
    noAccount: "Chưa có tài khoản?",
    signUpFree: "Đăng ký miễn phí",
    legal: "Bằng cách tiếp tục, bạn đồng ý với",
    terms: "Điều khoản",
    privacyPolicy: "Chính sách bảo mật",
  },

  dashboardPage: {
    welcome: "Chào buổi sáng, HR Manager 👋",
    welcomeSub: "Đây là những gì đang xảy ra với bộ công cụ tuyển dụng của bạn hôm nay.",
    generateBtn: "Tạo câu hỏi",
    statLabels: [
      "Tổng JD đã xử lý",
      "Câu hỏi đã tạo",
      "Tuần này",
      "TB câu hỏi / JD",
    ],
    weeklyActivity: {
      title: "Hoạt động tuần",
      subtitle: "Câu hỏi được tạo trong tuần này",
      questions: "Câu hỏi",
      jds: "JD",
    },
    categoryBreakdown: {
      title: "Theo danh mục",
      subtitle: "Phân tích loại câu hỏi",
      questions: "Câu hỏi",
    },
    recentSessions: {
      title: "Phiên gần đây",
      subtitle: "Các phiên tạo câu hỏi gần nhất của bạn",
      viewAll: "Xem tất cả",
      qs: "CH",
    },
    quickGenerate: {
      title: "Tạo câu hỏi mới",
      desc: "Tải lên hoặc dán mô tả công việc để nhận câu hỏi phỏng vấn được AI hỗ trợ trong vài giây.",
      btn: "Bắt đầu →",
    },
  },

  generatePage: {
    heading: "Tạo câu hỏi phỏng vấn",
    subtext:
      "Dán mô tả công việc hoặc tải lên tệp để nhận ngay câu hỏi được tùy chỉnh theo vai trò bởi AI.",
    jdInput: {
      title: "Mô tả công việc",
      placeholder: "Dán mô tả công việc của bạn vào đây...",
      exampleLabel: "Ví dụ:",
      exampleText:
        "Chúng tôi đang tìm kiếm một Frontend Developer Senior với hơn 5 năm kinh nghiệm React, kỹ năng TypeScript vững chắc và hiểu biết sâu về tối ưu hóa hiệu suất...",
      words: "từ",
      word: "từ",
      chars: "ký tự",
      tooShort: "Quá ngắn",
      clear: "Xóa",
    },
    fileUpload: {
      label: "Kéo & thả tệp, hoặc nhấp để chọn",
      support: "Hỗ trợ PDF, DOCX, DOC (tối đa 10MB)",
    },
    config: {
      title: "Cấu hình",
      jobRole: "Vai trò công việc",
      jobRolePlaceholder: "Chọn vai trò...",
      experienceLevel: "Cấp độ kinh nghiệm",
      experienceLevelPlaceholder: "Chọn cấp độ...",
      questionsPerCategory: "Số câu hỏi mỗi danh mục",
      helperText: "Mỗi danh mục (Kỹ thuật, Hành vi, Tình huống)",
      readyBanner: "Sẵn sàng tạo!",
      aiWillCreate: "AI sẽ tạo tối đa",
      questions: "câu hỏi",
      acrossCategories:
        "trong các danh mục Kỹ thuật, Hành vi và Tình huống cho một",
      roleWord: "vị trí.",
      generateBtn: "Tạo câu hỏi phỏng vấn",
    },
    progress: {
      heading: "AI đang tạo câu hỏi của bạn",
      subtext: "Vui lòng chờ trong khi chúng tôi soạn thảo câu hỏi phỏng vấn phù hợp...",
      done: "Xong",
      progressLabel: "Tiến độ",
    },
    steps: [
      "Đang phân tích mô tả công việc...",
      "Đang trích xuất kỹ năng & yêu cầu chính...",
      "Đang truy vấn cơ sở kiến thức với RAG...",
      "Đang tạo câu hỏi tùy chỉnh với AI...",
      "Đang phân loại & đánh giá độ khó...",
      "Đang hoàn thiện bộ câu hỏi của bạn...",
    ],
  },

  historyPage: {
    heading: "Lịch sử",
    subtext: "Duyệt và quản lý các phiên tạo câu hỏi trong quá khứ của bạn.",
    statLabels: ["Tổng phiên", "Câu hỏi đã tạo", "Tháng này"],
    filters: {
      searchPlaceholder: "Tìm kiếm theo tên công việc...",
      allRoles: "Tất cả vai trò",
      allLevels: "Tất cả cấp độ",
      exportAll: "Xuất tất cả",
    },
    table: {
      jobTitle: "Tên công việc",
      role: "Vai trò",
      level: "Cấp độ",
      date: "Ngày",
      questions: "Câu hỏi",
      actions: "Thao tác",
    },
  },

  settingsPage: {
    heading: "Cài đặt",
    subtext: "Quản lý tài khoản, tùy chọn và cấu hình AI của bạn.",
    tabs: {
      profile: "Hồ sơ",
      preferences: "Tùy chọn",
      notifications: "Thông báo",
      security: "Bảo mật",
      billing: "Thanh toán",
    },
    profile: {
      title: "Thông tin hồ sơ",
      photo: "Ảnh hồ sơ",
      photoFormats: "JPG, PNG, GIF tối đa 2MB",
      uploadPhoto: "Tải ảnh lên",
      firstName: "Tên",
      lastName: "Họ",
      email: "Địa chỉ Email",
      company: "Công ty",
      jobTitle: "Chức danh",
      bio: "Giới thiệu",
      save: "Lưu thay đổi",
    },
    preferences: {
      title: "Tùy chọn",
      appearance: "Giao diện",
      darkMode: "Chế độ tối",
      darkModeDesc: "Chuyển đổi giữa giao diện sáng và tối",
      light: "Sáng",
      dark: "Tối",
      system: "Hệ thống",
      aiSettings: "Cài đặt AI",
      aiModel: "Mô hình AI",
      outputLanguage: "Ngôn ngữ đầu ra",
      questionsPerCategory: "Số câu hỏi mỗi danh mục",
      questionTone: "Giọng điệu câu hỏi",
      showDifficulty: "Hiển thị nhãn độ khó",
      showDifficultyDesc: "Gắn nhãn từng câu hỏi là Dễ, Trung bình hoặc Khó",
      includeAnswers: "Bao gồm gợi ý trả lời",
      includeAnswersDesc: "Tạo gợi ý trả lời bằng AI cho mỗi câu hỏi",
      save: "Lưu thay đổi",
    },
    notifications: {
      title: "Tùy chọn thông báo",
      save: "Lưu thay đổi",
    },
    security: {
      title: "Cài đặt bảo mật",
      currentPassword: "Mật khẩu hiện tại",
      newPassword: "Mật khẩu mới",
      confirmPassword: "Xác nhận mật khẩu mới",
      currentPlaceholder: "Nhập mật khẩu hiện tại của bạn",
      newPlaceholder: "Nhập mật khẩu mới an toàn",
      confirmPlaceholder: "Lặp lại mật khẩu mới",
      requirements: "Yêu cầu mật khẩu",
      req1: "Ít nhất 8 ký tự",
      req2: "Chứa cả chữ hoa và chữ thường",
      req3: "Chứa ít nhất một số hoặc ký hiệu",
      save: "Lưu thay đổi",
    },
    billing: {
      title: "Thanh toán & Đăng ký",
      currentPlan: "Gói hiện tại",
      planName: "Chuyên nghiệp",
      active: "Đang hoạt động",
      perMonth: "/tháng",
      planFeatures: [
        "Xử lý JD không giới hạn",
        "Mô hình AI nâng cao (GPT-4)",
        "Xuất PDF/DOCX",
        "Hỗ trợ ưu tiên",
      ],
      upgradeBtn: "Nâng cấp gói",
      manageBtn: "Quản lý gói",
      monthlyUsage: "Sử dụng hàng tháng",
      billingHistory: "Lịch sử thanh toán",
      paid: "Đã thanh toán",
      download: "Tải xuống",
    },
  },

  resultsPage: {
    backToHistory: "Quay lại lịch sử",
    interviewQuestions: "Câu hỏi phỏng vấn",
    generatedFor: "Được tạo cho:",
    totalQuestions: "tổng câu hỏi",
    categories: "danh mục",
    readyToUse: "Sẵn sàng sử dụng",
    exportToPdf: "Xuất ra PDF",
    keywords: {
      title: "Từ khóa được trích xuất từ JD",
      found: "đã tìm thấy",
    },
    questionCard: {
      difficulty: {
        Easy: "Dễ",
        Medium: "Trung bình",
        Hard: "Khó",
      },
      showAnswer: "Hiện gợi ý trả lời",
      hideAnswer: "Ẩn gợi ý trả lời",
      aiAnswerLabel: "Gợi ý trả lời của AI",
      copy: "Sao chép",
      edit: "Chỉnh sửa",
      regenerate: "Tạo lại",
      delete: "Xóa",
    },
    tabs: {
      Technical: "Kỹ thuật",
      Behavioral: "Hành vi",
      Situational: "Tình huống",
    },
  },

  chatWidget: {
    title: "HireGen AI",
    subtitle: "Trực tuyến · Phản hồi nhanh",
    placeholder: "Hỏi tôi bất cứ điều gì...",
    send: "Gửi",
    clear: "Xóa hội thoại",
    welcomeMessage: "Xin chào! Tôi là trợ lý AI của HireGen. Tôi có thể giúp bạn:",
    welcomePoints: [
      "Cách thức hoạt động của nền tảng",
      "Gói giá & tính năng",
      "Xuất câu hỏi ra PDF",
      "Bắt đầu sử dụng miễn phí",
    ],
    typing: "Đang trả lời...",
    suggestedQuestions: [
      "Các gói giá là gì?",
      "Cách hoạt động như thế nào?",
      "Có thể xuất ra PDF không?",
    ],
    responses: {
      pricing:
        "Chúng tôi có 3 gói dịch vụ:\n• Miễn phí — 10 lần tạo/tháng\n• Pro (19$/tháng) — không giới hạn + xuất PDF\n• Enterprise — giá theo yêu cầu cho nhóm\n\nBắt đầu miễn phí, không cần thẻ tín dụng!",
      features:
        "HireGen AI trích xuất kỹ năng chính từ Mô tả Công việc, sau đó tạo ra các câu hỏi Kỹ thuật, Hành vi và Tình huống phù hợp — được hỗ trợ bởi RAG + GPT-4. Bạn cũng có thể xuất toàn bộ dưới dạng PDF.",
      howItWorks:
        "Rất đơn giản:\n1. Dán mô tả công việc của bạn\n2. AI trích xuất từ khóa & ngữ cảnh vai trò\n3. Câu hỏi được tạo trong vòng 30 giây\n4. Xuất hoặc sao chép bộ câu hỏi",
      export:
        "Có! Tất cả bộ câu hỏi đã tạo đều có thể xuất ra PDF được định dạng gọn gàng — sẵn sàng sử dụng trong buổi phỏng vấn.",
      vietnamese:
        "HireGen AI hỗ trợ đầy đủ tiếng Việt — bạn có thể nhập mô tả công việc bằng tiếng Việt và nhận câu hỏi bằng tiếng Việt!",
      fallback:
        "Câu hỏi hay đấy! Đăng ký miễn phí để khám phá tất cả tính năng — hoặc hỏi tôi thêm bất cứ điều gì về HireGen AI.",
    },
  },

  adminPages: {
    dashboard: {
      welcome: "Chào buổi sáng, Quản trị viên 👋",
      welcomeSub: "Đây là tổng quan toàn nền tảng hôm nay.",
      addUser: "Thêm người dùng",
      statLabels: [
        "Tổng người dùng",
        "Tổng nhà tuyển dụng",
        "JD đã xử lý",
        "Câu hỏi đã tạo",
      ],
      userGrowth: {
        title: "Tăng trưởng người dùng",
        subtitle: "Đăng ký mới mỗi tuần",
        recruiters: "Nhà tuyển dụng",
        guests: "Khách",
      },
      questionsTrend: {
        title: "Câu hỏi được tạo",
        subtitle: "Khối lượng tạo mỗi ngày trong tuần này",
        questions: "Câu hỏi",
      },
      recentActivity: {
        title: "Hoạt động hệ thống gần đây",
        subtitle: "Sự kiện nền tảng mới nhất",
        event: "Sự kiện",
        actor: "Người dùng",
        details: "Chi tiết",
        time: "Thời gian",
        eventLabels: {
          user_created: "Tạo người dùng",
          recruiter_login: "Đăng nhập",
          jd_generation: "Tạo câu hỏi",
          export: "Xuất file",
        },
      },
    },
    users: {
      heading: "Quản lý người dùng",
      subtext: "Quản lý tất cả tài khoản, vai trò và quyền truy cập.",
      addUser: "Thêm người dùng",
      stats: {
        totalUsers: "Tổng người dùng",
        activeUsers: "Người dùng hoạt động",
        pendingApproval: "Chờ phê duyệt",
      },
      filters: {
        searchPlaceholder: "Tìm theo tên hoặc email...",
        allRoles: "Tất cả vai trò",
        allStatus: "Tất cả trạng thái",
      },
      table: {
        name: "Họ tên",
        email: "Email",
        role: "Vai trò",
        status: "Trạng thái",
        created: "Ngày tạo",
        lastActive: "Hoạt động cuối",
        actions: "Hành động",
      },
      modal: {
        editTitle: "Chỉnh sửa người dùng",
        addTitle: "Thêm người dùng mới",
        fullName: "Họ và tên",
        emailLabel: "Địa chỉ email",
        role: "Vai trò",
        status: "Trạng thái",
        namePlaceholder: "VD: Nguyễn Văn A",
        emailPlaceholder: "nguoidung@congty.com",
        cancel: "Hủy",
        save: "Lưu thay đổi",
        create: "Tạo người dùng",
      },
      roles: { Admin: "Quản trị viên", Recruiter: "Nhà tuyển dụng", Guest: "Khách" },
      statusLabels: { Active: "Hoạt động", Pending: "Chờ duyệt", Suspended: "Tạm khóa" },
      actions: { view: "Xem", edit: "Chỉnh sửa", disable: "Vô hiệu hóa", delete: "Xóa" },
    },
    analytics: {
      heading: "Phân tích hệ thống",
      subtext: "Hiệu suất và thông tin sử dụng toàn nền tảng.",
      weeklyUsage: {
        title: "Sử dụng nền tảng theo tuần",
        subtitle: "Người dùng hoạt động so với lượt nộp JD",
        activeUsers: "Người dùng hoạt động",
        jdSubmissions: "Lượt nộp JD",
      },
      categoryChart: {
        title: "Danh mục câu hỏi",
        subtitle: "Phân bổ trên tất cả phiên",
        questions: "Câu hỏi",
      },
      roleDistribution: {
        title: "Phân bổ vai trò người dùng",
        subtitle: "Theo loại tài khoản",
        users: "người dùng",
        total: "Tổng người dùng đã đăng ký",
      },
    },
    content: {
      heading: "Nội dung đã tạo",
      subtext: "Xem tất cả phiên câu hỏi phỏng vấn được tạo trên nền tảng.",
      exportAll: "Xuất tất cả",
      filters: {
        searchPlaceholder: "Tìm theo tiêu đề công việc hoặc nhà tuyển dụng...",
        allRoles: "Tất cả vai trò",
        allTime: "Tất cả thời gian",
        today: "Hôm nay",
        thisWeek: "Tuần này",
        thisMonth: "Tháng này",
        last3Months: "3 tháng qua",
      },
      table: {
        jobTitle: "Tên công việc",
        recruiter: "Nhà tuyển dụng",
        role: "Vai trò",
        date: "Ngày",
        questions: "Câu hỏi",
        exported: "Đã xuất",
        actions: "Hành động",
      },
      exportedLabel: "Đã xuất",
      notExported: "Chưa xuất",
    },
    settings: {
      heading: "Cài đặt quản trị",
      subtext: "Cấu hình hành vi nền tảng, mô hình AI, quyền truy cập và thông báo.",
      tabs: {
        general: "Chung",
        aiConfig: "Cấu hình AI",
        permissions: "Quyền hạn",
        notifications: "Thông báo",
      },
      general: {
        title: "Cài đặt chung",
        platformName: "Tên nền tảng",
        defaultQuestionCount: "Số câu hỏi mặc định",
        maxJDs: "JD tối đa mỗi ngày (mỗi người dùng)",
        sessionTimeout: "Thời gian hết phiên (phút)",
        dangerZone: "Vùng nguy hiểm",
        resetTitle: "Đặt lại dữ liệu nền tảng",
        resetDesc: "Xóa tất cả phiên và phân tích đã tạo. Không thể hoàn tác.",
        resetBtn: "Đặt lại",
        saveBtn: "Lưu thay đổi",
      },
      aiConfig: {
        title: "Cấu hình AI",
        categories: "Danh mục câu hỏi mặc định",
        includePrefix: "Bao gồm câu hỏi",
        includeSuffix: "theo mặc định",
        languageModel: "Mô hình ngôn ngữ",
        temperature: "Nhiệt độ",
        tempHint: "0 = xác định, 1 = sáng tạo",
        maxTokens: "Token tối đa",
        saveBtn: "Lưu cấu hình AI",
        categoryLabels: ["Kỹ thuật", "Hành vi", "Tình huống", "Văn hóa", "Lãnh đạo"],
      },
      permissions: {
        title: "Quyền người dùng",
        feature: "Tính năng",
        adminCol: "Quản trị viên",
        recruiterCol: "Nhà tuyển dụng",
        guestCol: "Khách",
        lockedNote: "Quyền quản trị viên bị khóa và không thể thay đổi.",
        saveBtn: "Lưu quyền hạn",
        features: [
          { label: "Tạo câu hỏi", desc: "Truy cập bộ tạo câu hỏi JD" },
          { label: "Xem lịch sử", desc: "Duyệt các phiên tạo trước đây" },
          { label: "Xuất phiên", desc: "Xuất câu hỏi sang PDF/DOCX" },
          { label: "Xem phân tích", desc: "Truy cập dữ liệu sử dụng và phân tích" },
          { label: "Quản lý người dùng", desc: "Tạo, chỉnh sửa và vô hiệu hóa tài khoản" },
          { label: "Cài đặt hệ thống", desc: "Chỉnh sửa cấu hình nền tảng" },
        ],
      },
      notifications: {
        title: "Cài đặt thông báo",
        event: "Sự kiện",
        email: "Email",
        inApp: "Trong ứng dụng",
        saveBtn: "Lưu thông báo",
        events: [
          { label: "Đăng ký người dùng mới", desc: "Khi tạo tài khoản mới" },
          { label: "Tạo JD", desc: "Khi câu hỏi được tạo" },
          { label: "Xuất phiên", desc: "Khi phiên được xuất" },
          { label: "Đăng nhập đáng ngờ", desc: "Phát hiện hoạt động đăng nhập bất thường" },
          { label: "Cảnh báo hạn mức", desc: "Người dùng gần đạt giới hạn JD hàng ngày" },
          { label: "Lỗi hệ thống", desc: "Lỗi nền tảng nghiêm trọng" },
        ],
      },
    },
  },
};
