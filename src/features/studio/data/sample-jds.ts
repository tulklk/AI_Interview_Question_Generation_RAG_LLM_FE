export type SampleJdLang = "vi" | "en";

export type SampleJdLocalized = {
  vi: string;
  en: string;
};

export type SampleJd = {
  id: string;
  title: SampleJdLocalized;
  subtitle: SampleJdLocalized;
  content: SampleJdLocalized;
};

export const SAMPLE_JDS: SampleJd[] = [
  {
    id: "fullstack",
    title: {
      vi: "Fullstack Developer",
      en: "Fullstack Developer",
    },
    subtitle: {
      vi: "Fullstack Developer · 1–3 năm kinh nghiệm",
      en: "Fullstack Developer · 1–3 years of experience",
    },
    content: {
      vi: `Chúng tôi đang tìm kiếm một Fullstack Developer với 1–3 năm kinh nghiệm để xây dựng các ứng dụng web hoàn chỉnh từ frontend đến backend.

Trách nhiệm:
- Xây dựng RESTful API sử dụng ASP.NET Core hoặc Node.js.
- Phát triển giao diện người dùng sử dụng React.js hoặc Next.js.
- Thiết kế và làm việc với cơ sở dữ liệu PostgreSQL, SQL Server hoặc MySQL.
- Tích hợp xác thực, phân quyền và bảo mật hệ thống.
- Phối hợp với QA, UI/UX Designer và Product Team để phát triển tính năng.
- Debug các vấn đề trên frontend, backend và tầng cơ sở dữ liệu.

Yêu cầu:
- Có kinh nghiệm với C#, ASP.NET Core hoặc Node.js.
- Thành thạo React.js, TypeScript, HTML, CSS.
- Hiểu biết về REST API, JWT, thiết kế database, DTO và service layer.
- Quen thuộc với Git, Swagger, Postman, Docker là một lợi thế.
- Tư duy hệ thống và khả năng xử lý lỗi trong môi trường production.

Ứng viên cần có khả năng giải thích kiến trúc fullstack, luồng frontend-backend, bảo mật API, tối ưu hóa cơ sở dữ liệu và xử lý lỗi production.`,
      en: `We are looking for a Fullstack Developer with 1–3 years of experience to build complete web applications from frontend to backend.

Responsibilities:
- Build RESTful APIs using ASP.NET Core or Node.js.
- Develop user interfaces with React.js or Next.js.
- Design and work with PostgreSQL, SQL Server, or MySQL databases.
- Integrate authentication, authorization, and system security.
- Collaborate with QA, UI/UX Designers, and Product teams on features.
- Debug issues across frontend, backend, and database layers.

Requirements:
- Experience with C#, ASP.NET Core, or Node.js.
- Proficiency in React.js, TypeScript, HTML, and CSS.
- Understanding of REST APIs, JWT, database design, DTOs, and service layers.
- Familiarity with Git, Swagger, Postman, and Docker is a plus.
- Systems thinking and ability to troubleshoot production issues.

Candidates should be able to explain fullstack architecture, frontend–backend flows, API security, database optimization, and production incident handling.`,
    },
  },
  {
    id: "frontend",
    title: {
      vi: "Frontend Developer",
      en: "Frontend Developer",
    },
    subtitle: {
      vi: "Frontend Developer (React/Next) · 1–3 năm kinh nghiệm",
      en: "Frontend Developer (React/Next) · 1–3 years of experience",
    },
    content: {
      vi: `Chúng tôi đang tìm kiếm một Frontend Developer với 1–3 năm kinh nghiệm để xây dựng giao diện web hiện đại, hiệu năng cao và dễ bảo trì.

Trách nhiệm:
- Phát triển UI/UX bằng React.js, Next.js và TypeScript.
- Triển khai design system, component library và responsive layout.
- Tối ưu hiệu năng (Core Web Vitals, lazy loading, code splitting).
- Tích hợp REST/GraphQL API, quản lý state (Redux, Zustand hoặc React Query).
- Đảm bảo accessibility (a11y) và trải nghiệm đa trình duyệt.
- Phối hợp chặt với Backend, Design và QA trong sprint.

Yêu cầu:
- Thành thạo JavaScript/TypeScript, HTML5, CSS/Tailwind.
- Kinh nghiệm React Hooks, Next.js App Router hoặc Pages Router.
- Hiểu HTTP, CORS, authentication phía client (JWT/OAuth).
- Biết Git, ESLint, testing cơ bản (Jest, React Testing Library).
- Tư duy component-driven và khả năng đọc Figma.

Ứng viên cần giải thích được cách tổ chức frontend architecture, tối ưu render, xử lý lỗi API và đảm bảo UX ổn định trên production.`,
      en: `We are looking for a Frontend Developer with 1–3 years of experience to build modern, performant, and maintainable web UIs.

Responsibilities:
- Build UI/UX with React.js, Next.js, and TypeScript.
- Implement design systems, component libraries, and responsive layouts.
- Optimize performance (Core Web Vitals, lazy loading, code splitting).
- Integrate REST/GraphQL APIs and manage client state (Redux, Zustand, or React Query).
- Ensure accessibility (a11y) and cross-browser consistency.
- Collaborate closely with Backend, Design, and QA in sprints.

Requirements:
- Strong JavaScript/TypeScript, HTML5, and CSS/Tailwind skills.
- Experience with React Hooks and Next.js (App or Pages Router).
- Understanding of HTTP, CORS, and client-side auth (JWT/OAuth).
- Familiarity with Git, ESLint, and basic testing (Jest, React Testing Library).
- Component-driven mindset and ability to work from Figma.

Candidates should explain frontend architecture, render optimization, API error handling, and keeping UX stable in production.`,
    },
  },
  {
    id: "backend",
    title: {
      vi: "Backend Developer",
      en: "Backend Developer",
    },
    subtitle: {
      vi: "Backend Developer (.NET/Node) · 1–3 năm kinh nghiệm",
      en: "Backend Developer (.NET/Node) · 1–3 years of experience",
    },
    content: {
      vi: `Chúng tôi đang tìm kiếm một Backend Developer với 1–3 năm kinh nghiệm để thiết kế và vận hành API, dịch vụ và tầng dữ liệu cho sản phẩm phần mềm.

Trách nhiệm:
- Xây dựng RESTful / gRPC API với ASP.NET Core hoặc Node.js (NestJS/Express).
- Thiết kế database schema, migration, indexing và query tối ưu.
- Triển khai authentication/authorization (JWT, OAuth2, RBAC).
- Viết unit/integration test và tài liệu API (Swagger/OpenAPI).
- Theo dõi logging, monitoring và xử lý lỗi production.
- Làm việc với message queue (RabbitMQ, Kafka) khi cần.

Yêu cầu:
- Thành thạo C#/.NET hoặc Node.js/TypeScript.
- Hiểu SOLID, clean architecture, DTO, repository/service layer.
- Kinh nghiệm SQL (PostgreSQL/SQL Server/MySQL); NoSQL là lợi thế.
- Quen Git, Docker, CI cơ bản.
- Khả năng đọc và tối ưu query chậm.

Ứng viên cần giải thích được thiết kế API, giao dịch DB, bảo mật backend và cách xử lý sự cố production.`,
      en: `We are looking for a Backend Developer with 1–3 years of experience to design and operate APIs, services, and data layers for software products.

Responsibilities:
- Build RESTful / gRPC APIs with ASP.NET Core or Node.js (NestJS/Express).
- Design database schemas, migrations, indexing, and efficient queries.
- Implement authentication/authorization (JWT, OAuth2, RBAC).
- Write unit/integration tests and API docs (Swagger/OpenAPI).
- Own logging, monitoring, and production incident response.
- Work with message queues (RabbitMQ, Kafka) when needed.

Requirements:
- Strong C#/.NET or Node.js/TypeScript skills.
- Understanding of SOLID, clean architecture, DTOs, and repository/service layers.
- Experience with SQL (PostgreSQL/SQL Server/MySQL); NoSQL is a plus.
- Familiarity with Git, Docker, and basic CI.
- Ability to diagnose and optimize slow queries.

Candidates should explain API design, DB transactions, backend security, and production troubleshooting.`,
    },
  },
  {
    id: "mobile",
    title: {
      vi: "Mobile Developer",
      en: "Mobile Developer",
    },
    subtitle: {
      vi: "Mobile Developer (React Native/Flutter) · 1–3 năm kinh nghiệm",
      en: "Mobile Developer (React Native/Flutter) · 1–3 years of experience",
    },
    content: {
      vi: `Chúng tôi đang tìm kiếm một Mobile Developer với 1–3 năm kinh nghiệm để phát triển ứng dụng iOS/Android chất lượng cao bằng React Native hoặc Flutter.

Trách nhiệm:
- Xây dựng feature mobile theo design và yêu cầu sản phẩm.
- Tích hợp REST API, push notification, deep link và local storage.
- Tối ưu performance, battery và trải nghiệm offline cơ bản.
- Publish/build pipeline (TestFlight, Play Console, CI/CD mobile).
- Phối hợp Backend và Design để thống nhất contract API và UI.
- Fix crash, ANR và lỗi tương thích thiết bị.

Yêu cầu:
- Kinh nghiệm React Native (TypeScript) hoặc Flutter (Dart).
- Hiểu vòng đời app, navigation, state management.
- Biết Git, debugging native bridge cơ bản là lợi thế.
- Am hiểu guideline UX của iOS và Android.
- Có tư duy bảo mật dữ liệu trên thiết bị (secure storage, token).

Ứng viên cần giải thích kiến trúc mobile app, đồng bộ dữ liệu, xử lý lỗi mạng và quy trình release store.`,
      en: `We are looking for a Mobile Developer with 1–3 years of experience to build high-quality iOS/Android apps with React Native or Flutter.

Responsibilities:
- Deliver mobile features from product and design requirements.
- Integrate REST APIs, push notifications, deep links, and local storage.
- Optimize performance, battery usage, and basic offline UX.
- Own build/publish pipelines (TestFlight, Play Console, mobile CI/CD).
- Align API contracts and UI with Backend and Design.
- Fix crashes, ANRs, and device compatibility issues.

Requirements:
- Experience with React Native (TypeScript) or Flutter (Dart).
- Understanding of app lifecycle, navigation, and state management.
- Familiarity with Git; basic native bridge debugging is a plus.
- Knowledge of iOS and Android UX guidelines.
- Security mindset for on-device data (secure storage, tokens).

Candidates should explain mobile architecture, data sync, network error handling, and store release processes.`,
    },
  },
  {
    id: "devops",
    title: {
      vi: "DevOps / Cloud Engineer",
      en: "DevOps / Cloud Engineer",
    },
    subtitle: {
      vi: "DevOps / Cloud Engineer · 2–4 năm kinh nghiệm",
      en: "DevOps / Cloud Engineer · 2–4 years of experience",
    },
    content: {
      vi: `Chúng tôi đang tìm kiếm một DevOps / Cloud Engineer với 2–4 năm kinh nghiệm để xây dựng hạ tầng cloud, CI/CD và vận hành hệ thống ổn định.

Trách nhiệm:
- Thiết kế và vận hành hạ tầng trên AWS/Azure/GCP.
- Xây dựng CI/CD (GitHub Actions, Azure DevOps, GitLab CI).
- Quản lý container/orchestration (Docker, Kubernetes).
- Infrastructure as Code (Terraform hoặc Bicep/CloudFormation).
- Thiết lập monitoring, alerting, logging (Prometheus, Grafana, ELK/CloudWatch).
- Hỗ trợ security baseline, secret management và disaster recovery.

Yêu cầu:
- Kinh nghiệm Linux, networking cơ bản, cloud core services.
- Thành thạo Docker; Kubernetes là lợi thế mạnh.
- Hiểu CI/CD, blue-green/canary deployment.
- Biết scripting (Bash/Python/PowerShell).
- Tư duy reliability, cost optimization và on-call.

Ứng viên cần giải thích pipeline deploy, observability, scaling và xử lý sự cố production trên cloud.`,
      en: `We are looking for a DevOps / Cloud Engineer with 2–4 years of experience to build cloud infrastructure, CI/CD, and reliable operations.

Responsibilities:
- Design and operate infrastructure on AWS/Azure/GCP.
- Build CI/CD pipelines (GitHub Actions, Azure DevOps, GitLab CI).
- Manage containers/orchestration (Docker, Kubernetes).
- Infrastructure as Code (Terraform or Bicep/CloudFormation).
- Set up monitoring, alerting, and logging (Prometheus, Grafana, ELK/CloudWatch).
- Support security baselines, secret management, and disaster recovery.

Requirements:
- Experience with Linux, basic networking, and core cloud services.
- Strong Docker skills; Kubernetes is a major plus.
- Understanding of CI/CD and blue-green/canary deployments.
- Scripting ability (Bash/Python/PowerShell).
- Reliability mindset, cost awareness, and on-call readiness.

Candidates should explain deploy pipelines, observability, scaling, and cloud production incident response.`,
    },
  },
  {
    id: "qa",
    title: {
      vi: "QA Automation Engineer",
      en: "QA Automation Engineer",
    },
    subtitle: {
      vi: "QA Automation Engineer · 1–3 năm kinh nghiệm",
      en: "QA Automation Engineer · 1–3 years of experience",
    },
    content: {
      vi: `Chúng tôi đang tìm kiếm một QA Automation Engineer với 1–3 năm kinh nghiệm để đảm bảo chất lượng sản phẩm qua kiểm thử thủ công và tự động hóa.

Trách nhiệm:
- Phân tích requirement, viết test case và test plan.
- Xây dựng automation (Playwright, Cypress, Selenium hoặc Appium).
- Thực hiện API testing (Postman, Rest Assured) và regression.
- Theo dõi defect lifecycle, làm việc với Dev để reproduce bug.
- Tích hợp test vào CI/CD và báo cáo coverage/quality gate.
- Tham gia shift-left testing và review acceptance criteria.

Yêu cầu:
- Hiểu STLC, bug life cycle, kỹ thuật thiết kế test.
- Kinh nghiệm automation web hoặc API; mobile là lợi thế.
- Biết ít nhất một ngôn ngữ scripting (JavaScript/TypeScript/Java/Python).
- Quen Git, CI cơ bản, SQL đọc dữ liệu.
- Tư duy chi tiết, giao tiếp rõ ràng với Dev/PO.

Ứng viên cần giải thích chiến lược test, ưu tiên automation, và cách đánh giá rủi ro trước release.`,
      en: `We are looking for a QA Automation Engineer with 1–3 years of experience to ensure product quality through manual and automated testing.

Responsibilities:
- Analyze requirements and write test cases/plans.
- Build automation (Playwright, Cypress, Selenium, or Appium).
- Perform API testing (Postman, Rest Assured) and regression suites.
- Own the defect lifecycle and help Dev reproduce issues.
- Integrate tests into CI/CD and report coverage/quality gates.
- Practice shift-left testing and review acceptance criteria.

Requirements:
- Understanding of STLC, bug life cycle, and test design techniques.
- Experience automating web or API tests; mobile is a plus.
- Comfort with at least one scripting language (JavaScript/TypeScript/Java/Python).
- Familiarity with Git, basic CI, and SQL for data checks.
- Detail-oriented with clear communication to Dev/PO.

Candidates should explain test strategy, automation prioritization, and release risk assessment.`,
    },
  },
  {
    id: "data-engineer",
    title: {
      vi: "Data Engineer",
      en: "Data Engineer",
    },
    subtitle: {
      vi: "Data Engineer · 2–4 năm kinh nghiệm",
      en: "Data Engineer · 2–4 years of experience",
    },
    content: {
      vi: `Chúng tôi đang tìm kiếm một Data Engineer với 2–4 năm kinh nghiệm để xây dựng pipeline dữ liệu tin cậy phục vụ analytics và sản phẩm dữ liệu.

Trách nhiệm:
- Thiết kế ETL/ELT pipeline (batch và streaming khi cần).
- Xây dựng data warehouse/lakehouse (BigQuery, Snowflake, Redshift hoặc Databricks).
- Đảm bảo data quality, schema evolution và lineage.
- Viết SQL phức tạp, tối ưu transform và partition/clustering.
- Phối hợp với Analytics, ML và Backend về contract dữ liệu.
- Giám sát job failure, SLA và chi phí xử lý.

Yêu cầu:
- Thành thạo SQL và ít nhất một ngôn ngữ (Python/Scala).
- Kinh nghiệm Airflow, dbt, Spark hoặc tương đương.
- Hiểu modeling (star/snowflake), CDC và idempotency.
- Quen cloud storage/compute và Git.
- Tư duy reliability và documentation rõ ràng.

Ứng viên cần giải thích thiết kế pipeline, đảm bảo chất lượng dữ liệu và xử lý sự cố job production.`,
      en: `We are looking for a Data Engineer with 2–4 years of experience to build reliable data pipelines for analytics and data products.

Responsibilities:
- Design ETL/ELT pipelines (batch and streaming when needed).
- Build data warehouses/lakehouses (BigQuery, Snowflake, Redshift, or Databricks).
- Ensure data quality, schema evolution, and lineage.
- Write complex SQL and optimize transforms, partitions, and clustering.
- Align data contracts with Analytics, ML, and Backend teams.
- Monitor job failures, SLAs, and processing cost.

Requirements:
- Strong SQL and at least one language (Python/Scala).
- Experience with Airflow, dbt, Spark, or equivalents.
- Understanding of modeling (star/snowflake), CDC, and idempotency.
- Familiarity with cloud storage/compute and Git.
- Reliability mindset and clear documentation habits.

Candidates should explain pipeline design, data quality controls, and production job incident handling.`,
    },
  },
  {
    id: "ml",
    title: {
      vi: "Machine Learning Engineer",
      en: "Machine Learning Engineer",
    },
    subtitle: {
      vi: "Machine Learning Engineer · 2–4 năm kinh nghiệm",
      en: "Machine Learning Engineer · 2–4 years of experience",
    },
    content: {
      vi: `Chúng tôi đang tìm kiếm một Machine Learning Engineer với 2–4 năm kinh nghiệm để đưa mô hình ML từ nghiên cứu sang production.

Trách nhiệm:
- Xây dựng và đánh giá mô hình (classification, ranking, NLP hoặc recommendation).
- Feature engineering, experiment tracking và model validation.
- Triển khai serving (API/batch) và theo dõi drift/performance.
- Làm việc với Data Engineer về feature store và training data.
- Tối ưu latency/cost cho inference.
- Tài liệu hóa giả định mô hình và rủi ro.

Yêu cầu:
- Thành thạo Python, pandas, scikit-learn; PyTorch/TensorFlow là lợi thế.
- Hiểu train/eval metrics, overfitting, data leakage.
- Kinh nghiệm MLOps cơ bản (MLflow, Docker, CI cho model).
- Biết SQL và làm việc với dataset lớn.
- Giao tiếp tốt với Product/BA về use case và KPI.

Ứng viên cần giải thích vòng đời ML, cách đánh giá mô hình và vận hành inference ổn định trên production.`,
      en: `We are looking for a Machine Learning Engineer with 2–4 years of experience to take ML models from research to production.

Responsibilities:
- Build and evaluate models (classification, ranking, NLP, or recommendations).
- Feature engineering, experiment tracking, and model validation.
- Deploy serving (API/batch) and monitor drift/performance.
- Partner with Data Engineers on feature stores and training data.
- Optimize inference latency and cost.
- Document model assumptions and risks.

Requirements:
- Strong Python, pandas, scikit-learn; PyTorch/TensorFlow is a plus.
- Understanding of train/eval metrics, overfitting, and data leakage.
- Basic MLOps experience (MLflow, Docker, model CI).
- Comfortable with SQL and large datasets.
- Clear communication with Product/BA on use cases and KPIs.

Candidates should explain the ML lifecycle, model evaluation, and stable production inference operations.`,
    },
  },
  {
    id: "security",
    title: {
      vi: "Cybersecurity Analyst",
      en: "Cybersecurity Analyst",
    },
    subtitle: {
      vi: "Cybersecurity Analyst · 1–3 năm kinh nghiệm",
      en: "Cybersecurity Analyst · 1–3 years of experience",
    },
    content: {
      vi: `Chúng tôi đang tìm kiếm một Cybersecurity Analyst với 1–3 năm kinh nghiệm để giám sát, phân tích và giảm thiểu rủi ro bảo mật cho hệ thống IT.

Trách nhiệm:
- Theo dõi SIEM/alerts, triage incident và escalate khi cần.
- Phân tích vulnerability scan, hỗ trợ patch/remediation.
- Review cấu hình bảo mật cloud và ứng dụng (IAM, network, secrets).
- Hỗ trợ security awareness và kiểm tra tuân thủ cơ bản.
- Phối hợp Dev/DevOps về secure SDLC và threat modeling nhẹ.
- Ghi nhận playbook ứng phó sự cố.

Yêu cầu:
- Hiểu OWASP Top 10, networking, authentication/authorization.
- Quen Linux, firewall/VPN cơ bản; cloud security là lợi thế.
- Biết công cụ như Nessus, Wireshark, hoặc SIEM phổ biến.
- Kỹ năng phân tích log và viết báo cáo rõ ràng.
- Tư duy thận trọng, tuân thủ quy trình.

Ứng viên cần giải thích quy trình xử lý incident, đánh giá lỗ hổng và ưu tiên remediation theo rủi ro.`,
      en: `We are looking for a Cybersecurity Analyst with 1–3 years of experience to monitor, analyze, and reduce IT security risk.

Responsibilities:
- Monitor SIEM/alerts, triage incidents, and escalate when needed.
- Analyze vulnerability scans and support patching/remediation.
- Review cloud and application security configs (IAM, network, secrets).
- Support security awareness and basic compliance checks.
- Partner with Dev/DevOps on secure SDLC and lightweight threat modeling.
- Maintain incident response playbooks.

Requirements:
- Understanding of OWASP Top 10, networking, and authentication/authorization.
- Familiarity with Linux and basic firewall/VPN; cloud security is a plus.
- Experience with tools such as Nessus, Wireshark, or common SIEMs.
- Strong log analysis and clear reporting skills.
- Careful mindset and process discipline.

Candidates should explain incident handling, vulnerability assessment, and risk-based remediation prioritization.`,
    },
  },
  {
    id: "ba",
    title: {
      vi: "IT Business Analyst",
      en: "IT Business Analyst",
    },
    subtitle: {
      vi: "IT Business Analyst · 1–3 năm kinh nghiệm",
      en: "IT Business Analyst · 1–3 years of experience",
    },
    content: {
      vi: `Chúng tôi đang tìm kiếm một IT Business Analyst với 1–3 năm kinh nghiệm để kết nối nghiệp vụ và đội ngũ kỹ thuật trong các dự án phần mềm.

Trách nhiệm:
- Thu thập, phân tích và làm rõ requirement từ stakeholder.
- Viết user story, acceptance criteria và use case/flow.
- Tạo wireframe/mockup cơ bản hoặc làm việc với Design.
- Hỗ trợ UAT, theo dõi backlog và ưu tiên với Product Owner.
- Phân tích gap, impact change và tài liệu hóa quy trình.
- Phối hợp Dev/QA để đảm bảo hiểu đúng scope.

Yêu cầu:
- Hiểu SDLC/Agile, kỹ năng phỏng vấn stakeholder.
- Thành thạo viết tài liệu rõ ràng (Confluence/Notion/Word).
- Biết SQL đọc dữ liệu cơ bản là lợi thế.
- Am hiểu hệ thống web/API ở mức khái niệm.
- Giao tiếp tốt, tư duy logic và quản lý conflict nhẹ.

Ứng viên cần giải thích cách chuyển yêu cầu nghiệp vụ thành backlog kỹ thuật và đảm bảo chất lượng UAT trước go-live.`,
      en: `We are looking for an IT Business Analyst with 1–3 years of experience to bridge business stakeholders and engineering on software projects.

Responsibilities:
- Gather, analyze, and clarify requirements from stakeholders.
- Write user stories, acceptance criteria, and use cases/flows.
- Produce basic wireframes/mockups or partner with Design.
- Support UAT, backlog tracking, and prioritization with the Product Owner.
- Analyze gaps, change impact, and document processes.
- Align with Dev/QA to keep scope understood.

Requirements:
- Understanding of SDLC/Agile and stakeholder interview skills.
- Clear documentation habits (Confluence/Notion/Word).
- Basic SQL for data checks is a plus.
- Conceptual understanding of web systems/APIs.
- Strong communication, logical thinking, and light conflict handling.

Candidates should explain how business needs become technical backlog and how UAT quality is ensured before go-live.`,
    },
  },
];

export function getSampleJdById(id: string): SampleJd | undefined {
  return SAMPLE_JDS.find((s) => s.id === id);
}

export function resolveSampleJdText(
  sample: SampleJd,
  lang: SampleJdLang
): { title: string; subtitle: string; content: string } {
  const key = lang === "en" ? "en" : "vi";
  return {
    title: sample.title[key],
    subtitle: sample.subtitle[key],
    content: sample.content[key],
  };
}
