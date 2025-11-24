require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');
const serverless = require('serverless-http');

const app = express();
const port = 3001; // This port is not used in serverless environment, but kept for local development reference

// Setup multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Access your API key as an environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
console.log('Using GEMINI_API_KEY (first 5 chars):', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 5) + '...' : 'Not set');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Engineering roles with specific skills and question types
const ENGINEERING_ROLES = {
  'software-engineer': {
    name: 'Software Engineer',
    skills: ['programming', 'algorithms', 'data structures', 'software design', 'testing'],
    questionTypes: ['technical', 'behavioral', 'system design', 'coding']
  },
  'frontend-developer': {
    name: 'Frontend Developer',
    skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Vue', 'Angular', 'responsive design'],
    questionTypes: ['technical', 'UI/UX', 'performance', 'cross-browser compatibility']
  },
  'backend-developer': {
    name: 'Backend Developer',
    skills: ['APIs', 'databases', 'server architecture', 'security', 'scalability'],
    questionTypes: ['technical', 'system design', 'database design', 'security']
  },
  'fullstack-developer': {
    name: 'Full Stack Developer',
    skills: ['frontend', 'backend', 'databases', 'APIs', 'deployment'],
    questionTypes: ['technical', 'system design', 'full-stack architecture']
  },
  'data-engineer': {
    name: 'Data Engineer',
    skills: ['ETL', 'data pipelines', 'big data', 'databases', 'cloud platforms'],
    questionTypes: ['technical', 'data modeling', 'scalability', 'optimization']
  },
  'devops-engineer': {
    name: 'DevOps Engineer',
    skills: ['CI/CD', 'cloud platforms', 'containerization', 'monitoring', 'automation'],
    questionTypes: ['technical', 'infrastructure', 'deployment', 'monitoring']
  },
  'cybersecurity-engineer': {
    name: 'Cybersecurity Engineer',
    skills: ['security protocols', 'vulnerability assessment', 'incident response', 'compliance'],
    questionTypes: ['technical', 'security scenarios', 'threat analysis', 'compliance']
  },
  'machine-learning-engineer': {
    name: 'Machine Learning Engineer',
    skills: ['ML algorithms', 'data science', 'Python', 'TensorFlow', 'model deployment'],
    questionTypes: ['technical', 'ML concepts', 'model evaluation', 'production deployment']
  },
  'mobile-developer': {
    name: 'Mobile Developer',
    skills: ['iOS', 'Android', 'React Native', 'Flutter', 'mobile UI/UX'],
    questionTypes: ['technical', 'platform-specific', 'performance', 'user experience']
  },
  'cloud-engineer': {
    name: 'Cloud Engineer',
    skills: ['AWS', 'Azure', 'GCP', 'containerization', 'infrastructure as code'],
    questionTypes: ['technical', 'cloud architecture', 'cost optimization', 'scalability']
  }
};

// Predefined questions and answers for specific roles
const PREDEFINED_QUESTIONS = {
  'software-engineer': [
    {
      question: "Can you explain the difference between a process and a thread?",
      expectedAnswer: "A process is an independent execution unit that has its own memory space, while a thread is a lightweight sub-process that shares the same memory space as its parent process. Processes are more isolated and robust, while threads are more efficient for concurrent execution within the same program."
    },
    {
      question: "What is object-oriented programming (OOP)? Can you list its four main principles?",
      expectedAnswer: "OOP is a programming paradigm based on the concept of 'objects', which can contain data and code. Its four main principles are Encapsulation, Inheritance, Polymorphism, and Abstraction."
    },
    {
      question: "Describe a time you encountered a difficult bug. How did you debug it?",
      expectedAnswer: "I once had a bug where a specific user action caused a data corruption issue that was hard to reproduce. I used a combination of logging, stepping through the code with a debugger, and isolating the problematic code section to identify the root cause, which was an incorrect assumption about data state after an asynchronous operation."
    },
    {
      question: "What are RESTful APIs? What are their key characteristics?",
      expectedAnswer: "RESTful APIs are a way of building web services that adhere to the REST architectural style. Key characteristics include statelessness, client-server architecture, cacheability, and a uniform interface (using standard HTTP methods like GET, POST, PUT, DELETE)."
    },
    {
      question: "Explain the concept of 'Big O' notation and why it's important.",
      expectedAnswer: "Big O notation is used to describe the performance or complexity of an algorithm. It specifically describes the worst-case scenario and helps us understand how an algorithm's runtime or space requirements grow as the input size increases, which is crucial for choosing efficient algorithms."
    },
    {
      question: "How do you handle errors in your code? Can you give an example?",
      expectedAnswer: "I typically use try-catch blocks for synchronous operations and promise rejections/error-first callbacks for asynchronous ones. For example, when fetching data from an API, I'd wrap the fetch call in a try-catch to handle network errors or invalid responses gracefully, logging the error and providing user-friendly feedback."
    }
  ],
  'frontend-developer': [
    {
      question: "Explain the concept of the DOM and how JavaScript interacts with it.",
      expectedAnswer: "The DOM (Document Object Model) is a programming interface for web documents. It represents the page structure as a tree of objects, and JavaScript can access and modify these objects to change the content, structure, and style of a web page."
    },
    {
      question: "What are the key differences between React, Angular, and Vue.js?",
      expectedAnswer: "React is a JavaScript library for building user interfaces, focusing on a component-based architecture and virtual DOM. Angular is a comprehensive framework with a steep learning curve, offering a structured approach to app development. Vue.js is a progressive framework, easier to learn and integrate, offering flexibility between a library and a full framework."
    },
    {
      question: "How do you ensure a website is responsive and performs well across different devices?",
      expectedAnswer: "Responsiveness is achieved using techniques like media queries, flexible grid layouts (Flexbox/CSS Grid), and relative units. Performance involves optimizing images, deferring non-critical CSS/JS, lazy loading, and leveraging browser caching."
    },
    {
      question: "Describe a challenge you faced with cross-browser compatibility and how you resolved it.",
      expectedAnswer: "I once encountered an issue where a specific CSS animation worked perfectly in Chrome but was broken in Firefox. After investigation, I found it was due to vendor prefixes and slightly different rendering engines. I resolved it by using Autoprefixer in my build process and adding specific CSS fallback properties for Firefox."
    },
    {
      question: "Explain the concept of a Virtual DOM and how it improves performance in libraries like React.",
      expectedAnswer: "A Virtual DOM (VDOM) is a lightweight copy of the actual DOM. When state changes in a React component, a new VDOM is created. React then compares the new VDOM with the previous one, calculates the most efficient way to update the real DOM, and applies only those changes, minimizing direct manipulation of the slower browser DOM and thus improving performance."
    },
    {
      question: "What are common approaches to state management in large-scale frontend applications?",
      expectedAnswer: "Common approaches include using centralized state management libraries like Redux (with React) or Vuex (with Vue.js), the React Context API, or more localized component state management. The choice depends on the application's complexity and the team's preference for explicit data flow versus easier setup."
    }
  ],
  'backend-developer': [
    {
      question: "Discuss the principles of designing RESTful APIs and common authentication methods.",
      expectedAnswer: "RESTful API principles include statelessness, client-server architecture, cacheability, and a uniform interface. Common authentication methods include API keys, OAuth 2.0, JWT (JSON Web Tokens), and session-based authentication."
    },
    {
      question: "Explain the differences between SQL and NoSQL databases, and when to use each.",
      expectedAnswer: "SQL databases are relational, use structured query language, and are vertically scalable, best for complex queries and structured data. NoSQL databases are non-relational, offer flexible schemas, and are horizontally scalable, better for large amounts of unstructured data and high traffic. SQL databases are typically used when data integrity and complex relationships are paramount, while NoSQL databases are preferred for high scalability, flexibility, and handling large volumes of rapidly changing data."
    },
    {
      question: "How do you handle error logging and monitoring in a backend application?",
      expectedAnswer: "Error logging involves capturing detailed error information (stack traces, request data) using libraries like Winston or Log4js. Monitoring uses tools like Prometheus, Grafana, or New Relic to track application performance metrics, server health, and alert on anomalies."
    },
    {
      question: "Describe a time you had to optimize a database query for performance.",
      expectedAnswer: "I was working on a reporting feature where a query was taking too long due to large joins and a lack of proper indexing. I analyzed the query using `EXPLAIN` (for SQL databases), identified missing indexes, added composite indexes on frequently filtered columns, and refactored the query to avoid unnecessary joins, reducing execution time significantly."
    },
    {
      question: "What are microservices? What are their advantages and disadvantages compared to a monolithic architecture?",
      expectedAnswer: "Microservices are a software architecture style where an application is composed of small, independent services that communicate via APIs. Advantages include improved scalability, flexibility in technology choices, and independent deployment. Disadvantages can be increased complexity in management, distributed data consistency challenges, and operational overhead."
    },
    {
      question: "How do you ensure data security and integrity in your backend applications?",
      expectedAnswer: "Data security involves using encryption for data in transit (HTTPS) and at rest, implementing strong authentication and authorization mechanisms (JWT, OAuth), input validation to prevent injection attacks, and regularly patching vulnerabilities. Data integrity is maintained through database transactions, proper indexing, and validation rules at the application layer."
    }
  ],
  'fullstack-developer': [
    {
      question: "Walk me through the architecture of a typical full-stack application.",
      expectedAnswer: "A typical full-stack application consists of a frontend (client-side, e.g., React, Angular, Vue), a backend (server-side, e.g., Node.js, Python, Java), and a database (e.g., PostgreSQL, MongoDB). The frontend sends requests to the backend API, which processes business logic, interacts with the database, and sends data back to the frontend."
    },
    {
      question: "How do you manage state across the frontend and backend in a full-stack application?",
      expectedAnswer: "Frontend state can be managed using libraries like Redux, Vuex, or React Context. Backend state often involves database storage, caching layers (Redis), and sometimes session management. Communication between frontend and backend typically uses REST APIs or GraphQL, ensuring data consistency and synchronization."
    },
    {
      question: "Describe a project where you had to integrate a third-party API both on the frontend and backend.",
      expectedAnswer: "In a project, I integrated a payment gateway API. On the backend, I handled secure transaction processing, webhooks for status updates, and storing sensitive payment data. On the frontend, I used the API for displaying payment forms, handling client-side validation, and providing real-time feedback to the user during the payment process."
    },
    {
      question: "What are some common challenges in full-stack development and how do you address them?",
      expectedAnswer: "Challenges include maintaining consistent data models across frontend and backend, ensuring robust error handling, managing deployment complexities, and optimizing performance across the stack. I address these by using shared schemas, comprehensive logging, CI/CD pipelines, and performance monitoring tools for both client and server."
    },
    {
      question: "How do you approach testing in a full-stack environment?",
      expectedAnswer: "Testing involves unit tests for individual functions/components, integration tests for API endpoints and database interactions, and end-to-end tests to simulate user flows across the entire application. I use frameworks like Jest, Cypress, or Playwright to automate these tests."
    },
    {
      question: "Explain the concept of server-side rendering (SSR) or static site generation (SSG) and when to use them in a full-stack project.",
      expectedAnswer: "SSR involves rendering frontend frameworks (like React, Vue) on the server into HTML before sending it to the client, improving initial load times and SEO. SSG involves building static HTML files at compile time, which are then served. SSR is good for dynamic, frequently changing content, while SSG is ideal for content that changes infrequently, offering high performance and security."
    }
  ],
  'data-engineer': [
    {
      question: "What is ETL and describe its various stages in a data pipeline.",
      expectedAnswer: "ETL stands for Extract, Transform, Load. Extract involves pulling data from various sources. Transform cleans, validates, and manipulates the data into a usable format. Load pushes the transformed data into a target system, such as a data warehouse or data lake."
    },
    {
      question: "Explain the difference between batch and stream processing for data.",
      expectedAnswer: "Batch processing handles large volumes of data collected over a period, processed in bulk. Stream processing, on the other hand, processes data continuously as it arrives, providing near real-time insights. Batch is suitable for historical analysis, while stream is for immediate reactions."
    },
    {
      question: "How do you ensure data quality and integrity in a large data system?",
      expectedAnswer: "Data quality is ensured through validation rules, deduplication, cleansing, and profiling during the ETL process. Data integrity involves using constraints (e.g., primary keys, foreign keys), transaction management, and robust error handling to prevent corruption or inconsistency."
    },
    {
      question: "Describe different types of data warehousing schemas (e.g., Star Schema, Snowflake Schema) and their use cases.",
      expectedAnswer: "Star Schema consists of a central fact table surrounded by denormalized dimension tables, simple and good for querying. Snowflake Schema is an extension of Star, where dimension tables are normalized, offering better data integrity but more complex queries. Star is often preferred for ease of use and performance in data marts."
    },
    {
      question: "What is the role of data governance in data engineering projects?",
      expectedAnswer: "Data governance establishes policies and procedures for data management, including data privacy, security, quality, and accessibility. In data engineering, it ensures compliance, maintains trust in data assets, and defines roles and responsibilities for data stewardship, crucial for ethical and legal data handling."
    },
    {
      question: "How do you handle schema evolution in data pipelines, especially with changing data sources?",
      expectedAnswer: "Schema evolution can be handled using tools like Apache Avro or Parquet, which support schema changes without breaking existing pipelines. Strategies include schema registry for managing versions, backward and forward compatibility, and implementing robust error handling to address unexpected schema changes."
    }
  ],
  'devops-engineer': [
    {
      question: "What is CI/CD and how do you implement it in a project?",
      expectedAnswer: "CI/CD stands for Continuous Integration/Continuous Delivery (or Deployment). CI involves frequently merging code changes into a central repository, followed by automated builds and tests. CD automates the release of validated code to production environments. Tools like Jenkins, GitLab CI, or GitHub Actions are used for implementation."
    },
    {
      question: "Describe your experience with containerization technologies like Docker and orchestration tools like Kubernetes.",
      expectedAnswer: "I have used Docker to package applications and their dependencies into portable containers, ensuring consistent environments. For orchestration, I've worked with Kubernetes to automate deployment, scaling, and management of containerized applications across clusters, handling aspects like load balancing, service discovery, and self-healing."
    },
    {
      question: "How do you approach monitoring and logging in a production environment?",
      expectedAnswer: "For monitoring, I typically set up dashboards with tools like Grafana, pulling metrics from Prometheus to track application performance, resource utilization, and error rates. Logging involves centralized log management (e.g., ELK stack, Splunk) for collecting, analyzing, and alerting on application logs."
    },
    {
      question: "Explain the concept of 'Infrastructure as Code' (IaC) and benefits of using tools like Terraform or Ansible.",
      expectedAnswer: "IaC is the management of infrastructure (networks, virtual machines, load balancers) in a descriptive model, using the same versioning as source code. Benefits include consistency, reduced manual errors, faster deployments, and improved scalability. Terraform is used for provisioning, while Ansible is for configuration management."
    },
    {
      question: "What are some common deployment strategies (e.g., Blue/Green, Canary) and when would you use each?",
      expectedAnswer: "Blue/Green deployment involves running two identical production environments (Blue is active, Green is idle) and switching traffic, ensuring zero downtime and easy rollback. Canary deployment involves gradually rolling out changes to a small subset of users, monitoring feedback before full rollout. Blue/Green is for major releases, Canary for risky features."
    },
    {
      question: "How do you ensure security in your CI/CD pipelines?",
      expectedAnswer: "Security in CI/CD involves scanning code for vulnerabilities (SAST, DAST), using secure base images for containers, implementing secrets management, restricting access to CI/CD tools, and integrating security checks as early as possible in the development lifecycle (Shift Left security)."
    }
  ],
  'cybersecurity-engineer': [
    {
      question: "Explain common web vulnerabilities (e.g., XSS, SQL Injection) and how to prevent them.",
      expectedAnswer: "XSS (Cross-Site Scripting) occurs when malicious scripts are injected into trusted websites, often prevented by input sanitization and output encoding. SQL Injection involves manipulating database queries through user input, prevented by using parameterized queries or prepared statements."
    },
    {
      question: "What are some best practices for securing APIs and data in transit?",
      expectedAnswer: "Best practices include using HTTPS for all communication, implementing strong authentication (OAuth 2.0, JWT), authorization (RBAC), input validation, rate limiting, and regularly auditing API security. Data in transit should always be encrypted."
    },
    {
      question: "Describe an incident response process you've been involved in or would implement.",
      expectedAnswer: "A typical incident response process includes preparation, identification (detecting the incident), containment (limiting damage), eradication (removing the cause), recovery (restoring operations), and post-incident analysis (lessons learned). I would emphasize clear communication, detailed documentation, and regular testing of the plan."
    },
    {
      question: "What is the difference between symmetric and asymmetric encryption? Provide examples of where each is used.",
      expectedAnswer: "Symmetric encryption uses a single, shared secret key for both encryption and decryption (e.g., AES), often used for bulk data encryption. Asymmetric encryption uses a pair of keys (public and private) for encryption and decryption (e.g., RSA), primarily used for secure key exchange and digital signatures."
    },
    {
      question: "Explain the concept of a firewall and different types of firewalls.",
      expectedAnswer: "A firewall is a network security system that monitors and controls incoming and outgoing network traffic based on predetermined security rules. Types include packet-filtering firewalls (basic, based on IP/port), stateful inspection firewalls (track connection state), application-layer gateways (inspect traffic at app layer), and next-generation firewalls (NGFWs - combine traditional features with advanced threat prevention)."
    },
    {
      question: "How do you stay updated on the latest cybersecurity threats and vulnerabilities?",
      expectedAnswer: "I regularly follow industry news and blogs (e.g., SANS, KrebsOnSecurity), subscribe to security advisories and newsletters, participate in security communities and forums, attend webinars and conferences, and study CVE (Common Vulnerabilities and Exposures) databases to understand emerging threats."
    }
  ],
  'machine-learning-engineer': [
    {
      question: "Explain the bias-variance tradeoff in machine learning.",
      expectedAnswer: "The bias-variance tradeoff refers to the dilemma of simultaneously minimizing two sources of error that prevent supervised learning algorithms from generalizing beyond their training set. Bias is error from erroneous assumptions in the learning algorithm (underfitting). Variance is error from sensitivity to small fluctuations in the training set (overfitting). Achieving a balance is key to good model performance."
    },
    {
      question: "How do you deploy a machine learning model into production?",
      expectedAnswer: "Deployment involves packaging the model, its dependencies, and a serving API (e.g., Flask, FastAPI) into a container (Docker). This container is then deployed to a cloud platform (AWS SageMaker, GCP AI Platform, Azure ML) or an on-premise server, often managed by an orchestration tool like Kubernetes. Monitoring for drift and performance is crucial post-deployment."
    },
    {
      question: "Describe a project where you used a specific ML algorithm and its performance metrics.",
      expectedAnswer: "In a sentiment analysis project, I used a Logistic Regression model. Key performance metrics were accuracy, precision, recall, and F1-score. I specifically focused on precision and recall to balance correctly identifying positive sentiments (precision) with not missing any (recall), achieving an1 F1-score of 0.85 after hyperparameter tuning."
    },
    {
      question: "What is overfitting and underfitting in machine learning, and how do you mitigate them?",
      expectedAnswer: "Overfitting occurs when a model learns the training data too well, capturing noise and performing poorly on unseen data. Underfitting happens when a model is too simple to capture the underlying pattern in the data. Mitigation for overfitting includes regularization (L1/L2), cross-validation, more data, feature selection, and early stopping. Underfitting can be mitigated by using more complex models, more features, or reducing regularization."
    },
    {
      question: "Explain different types of machine learning (supervised, unsupervised, reinforcement) and provide an example for each.",
      expectedAnswer: "Supervised learning uses labeled data to train models to predict outcomes (e.g., image classification with labeled images). Unsupervised learning works with unlabeled data to find hidden patterns (e.g., customer segmentation). Reinforcement learning trains agents to make decisions by trial and error in an environment (e.g., training an AI to play chess)."
    },
    {
      question: "How do you handle imbalanced datasets in classification problems?",
      expectedAnswer: "Handling imbalanced datasets involves techniques like oversampling the minority class (e.g., SMOTE), undersampling the majority class, using cost-sensitive learning algorithms, or employing ensemble methods like EasyEnsemble or BalanceCascade. The goal is to ensure the model doesn't bias towards the majority class."
    }
  ],
  'mobile-developer': [
    {
      question: "Discuss the differences between native, hybrid, and web mobile app development.",
      expectedAnswer: "Native apps are built for a specific platform (iOS/Android) using platform-specific languages (Swift/Kotlin), offering best performance and access to device features. Hybrid apps (React Native, Flutter) use a single codebase for multiple platforms but may have performance limitations. Web apps (PWAs) are browser-based, offering wide reach but limited device access and often lower performance."
    },
    {
      question: "What are some performance optimization techniques for mobile applications?",
      expectedAnswer: "Techniques include optimizing network requests (batching, caching), efficient image loading, reducing UI complexity, minimizing memory usage, background task optimization, and leveraging native device capabilities efficiently. Profiling tools are essential for identifying bottlenecks."
    },
    {
      question: "Describe a challenge you faced with UI/UX design on a mobile platform.",
      expectedAnswer: "I once worked on an e-commerce app where the checkout flow was too long and complex for mobile users. The challenge was to simplify it without losing critical information. I redesigned it to a multi-step form with clear progress indicators, used larger tap targets, and reduced input fields, resulting in a significant increase in conversion rates."
    },
    {
      question: "Explain the lifecycle of an Android Activity or an iOS ViewController.",
      expectedAnswer: "For Android Activity, the lifecycle includes `onCreate()`, `onStart()`, `onResume()`, `onPause()`, `onStop()`, and `onDestroy()`, managing how an activity transitions through states. For iOS ViewController, methods like `viewDidLoad()`, `viewWillAppear()`, `viewDidAppear()`, `viewWillDisappear()`, and `viewDidDisappear()` manage view states and resource allocation."
    },
    {
      question: "How do you handle data persistence in mobile applications?",
      expectedAnswer: "Data persistence can be achieved using various methods: Shared Preferences/UserDefaults for small key-value pairs, SQLite databases (Room for Android, Core Data for iOS) for structured data, file storage for large media, and cloud synchronization for cross-device access and backup. The choice depends on data volume, structure, and security needs."
    },
    {
      question: "What is dependency injection and how is it used in mobile development?",
      expectedAnswer: "Dependency Injection (DI) is a design pattern where a component receives its dependencies from an external source rather than creating them itself. In mobile development, DI (e.g., Dagger 2 for Android, Swinject for iOS) helps in creating modular, testable, and maintainable code by decoupling components and managing their creation and lifecycle."
    }
  ],
  'cloud-engineer': [
    {
      question: "Compare and contrast different cloud service models (IaaS, PaaS, SaaS) with examples.",
      expectedAnswer: "IaaS (Infrastructure as a Service) provides virtualized computing resources (VMs, networks) like AWS EC2. PaaS (Platform as a Service) offers a platform for developing, running, and managing applications without building infrastructure (e.g., AWS Elastic Beanstalk). SaaS (Software as a Service) delivers ready-to-use applications over the internet (e.g., Google Workspace, Salesforce)."
    },
    {
      question: "Describe your experience with infrastructure-as-code tools (e.g., Terraform, CloudFormation).",
      expectedAnswer: "I have used Terraform to define and provision infrastructure in cloud environments (AWS, Azure) using declarative configuration files. This allowed for versioning, collaboration, and automated deployment of resources like VMs, databases, and networks, ensuring consistency and reducing manual errors."
    },
    {
      question: "How do you design for scalability and cost optimization in a cloud environment?",
      expectedAnswer: "Scalability is achieved through auto-scaling groups, load balancing, serverless architectures, and horizontally scaling databases. Cost optimization involves right-sizing resources, using spot instances, reserved instances, implementing cost monitoring, and leveraging serverless options where appropriate to pay only for consumption."
    },
    {
      question: "Explain serverless computing and its benefits/drawbacks.",
      expectedAnswer: "Serverless computing allows developers to build and run applications without managing servers. Benefits include automatic scaling, reduced operational costs (pay-per-execution), and faster development cycles. Drawbacks can include vendor lock-in, potential cold starts, and complex monitoring/debugging for distributed functions."
    },
    {
      question: "What are common security best practices in cloud environments?",
      expectedAnswer: "Security best practices include implementing Identity and Access Management (IAM) with least privilege, encrypting data at rest and in transit, network segmentation (VPCs, subnets), regularly auditing configurations, using security groups/firewalls, and leveraging cloud-native security services (e.g., AWS WAF, Azure Security Center)."
    },
    {
      question: "Describe your experience with disaster recovery (DR) and high availability (HA) strategies in the cloud.",
      expectedAnswer: "For HA, I've implemented solutions like deploying resources across multiple Availability Zones, using load balancers, and configuring auto-scaling. For DR, I've worked on strategies like backup and restore, pilot light, and warm standby across different regions, ensuring business continuity with minimal downtime and data loss."
    }
  ]
};

// Store interview sessions
const interviewSessions = new Map();

// Helper function to generate session ID
function generateSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// API endpoint to get available engineering roles
app.get('/api/roles', (req, res) => {
  res.json(ENGINEERING_ROLES);
});

// Helper: simple fallback question generator when external AI is not available
function fallbackFirstQuestion(selectedRole, resumeText) {
  const skills = selectedRole.skills.slice(0, 3).join(', ');
  return `Hi — thanks for joining. I see experience related to ${skills} on your resume. Can you describe a recent project where you applied those skills, the challenges you faced, and the outcome?`;
}

function fallbackNextQuestion(selectedRole, conversationHistory) {
  // Try to build a follow-up based on last user answer
  const lastUser = [...conversationHistory].reverse().find(e => e.role === 'user');
  if (lastUser && lastUser.text) {
    return `Thanks for that detail. Can you build on that by explaining the technical trade-offs you considered and why you chose the approach you did?`;
  }
  // Generic question if no prior answer
  return `Can you walk me through your development process for a feature from design to deployment, focusing on testing and reliability?`;
}

function fallbackFeedback(selectedRole, resumeText, conversationHistory) {
  // Basic heuristic feedback
  const strengths = [];
  const improvements = [];
  const skills = selectedRole.skills.slice(0, 5);

  // If resume mentions keywords from role skills, mark strength (very naive)
  const lowerResume = (resumeText || '').toLowerCase();
  skills.forEach(s => {
    if (lowerResume.includes(s.toLowerCase())) strengths.push(s);
    else improvements.push(s);
  });

  const score = Math.max(4, Math.min(9, 6 + Math.floor((strengths.length - improvements.length) / 2)));

  return `Overall Performance Score: ${score}/10\n\nStrengths:\n- ${strengths.length ? strengths.join('\n- ') : 'Provided clear examples and showed domain knowledge.'}\n\nAreas for Improvement:\n- ${improvements.length ? improvements.join('\n- ') : 'Work on structuring answers with STAR (Situation, Task, Action, Result).'}\n\nTechnical Competency:\n- ${strengths.length ? 'Shows familiarity with: ' + strengths.join(', ') : 'Needs deeper technical examples and metrics.'}\n\nCommunication Skills:\n- Be concise and use concrete metrics where possible. Practice structuring answers and summarizing outcomes.\n\nFinal Recommendation:\n- Maybe. Candidate demonstrates potential but would benefit from stronger depth on a couple of key technologies.\n\nSpecific Next Steps:\n- Focus learning on: ${improvements.slice(0,3).join(', ')}\n- Prepare 2-3 detailed project stories with metrics and your specific impact.\n`;
}

// API endpoint to upload resume and get extracted text
app.post('/api/upload-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No resume file uploaded.' });
    }

    // Extract text from PDF
    const data = await pdf(req.file.buffer);
    const resumeText = data.text;
    console.log('Extracted resume text length:', resumeText.length);
    console.log('Resume file name:', req.file.originalname);

    // Generate session ID
    const sessionId = generateSessionId();
    console.log('Generated session ID:', sessionId);
    
    // Store resume data in session
    interviewSessions.set(sessionId, {
      resumeText: resumeText,
      fileName: req.file.originalname,
      uploadTime: new Date().toISOString(),
      conversationHistory: [],
      selectedRole: null,
      currentQuestionIndex: 0
    });

    res.json({ 
      success: true, 
      sessionId: sessionId,
      message: 'Resume uploaded successfully',
      resumePreview: resumeText.substring(0, 200) + '...'
    });
  } catch (error) {
    console.error('Error uploading resume:', error);
    if (error.message && error.message.includes('Invalid PDF structure')) {
      return res.status(400).json({ error: 'The uploaded file is not a valid PDF or has an invalid structure. Please upload a different PDF.' });
    }
    res.status(500).json({ error: 'Failed to upload resume due to an unexpected error.' });
  }
});

// API endpoint to start interview with selected role
app.post('/api/start-interview', async (req, res) => {
  try {
    const { sessionId, roleKey } = req.body;
    
    if (!sessionId || !interviewSessions.has(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    if (!roleKey || !ENGINEERING_ROLES[roleKey]) {
      return res.status(400).json({ error: 'Invalid role selected' });
    }

    const session = interviewSessions.get(sessionId);
    const selectedRole = ENGINEERING_ROLES[roleKey];
    
    // Update session with selected role
    session.selectedRole = selectedRole;
    session.roleKey = roleKey;
    
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Check for predefined questions
    const predefinedQuestionsForRole = PREDEFINED_QUESTIONS[roleKey];
    let question;

    if (predefinedQuestionsForRole && predefinedQuestionsForRole.length > 0) {
      question = predefinedQuestionsForRole[0].question;
      session.currentQuestionIndex = 0; // Initialize question index for predefined questions
      console.log('Using predefined first question:', question);
    } else {
      // Fallback if no predefined questions are available for the role
      question = fallbackFirstQuestion(selectedRole, session.resumeText);
      question = `(Fallback: No predefined questions for this role) ${question}`;
      session.currentQuestionIndex = -1; // Indicate AI-generated questions (or fallback)
    }
    
    // Store the first question in conversation history
    session.conversationHistory.push({ 
      role: 'ai', 
      text: question,
      timestamp: new Date().toISOString()
    });

    res.json({ 
      success: true,
      question: question,
      roleName: selectedRole.name,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Error starting interview (overall):', error);
    res.status(500).json({ error: 'Failed to start interview' });
  }
});

// API endpoint to submit answer and get next question
app.post('/api/submit-answer', async (req, res) => {
  try {
    const { sessionId, userAnswer } = req.body;
    
    if (!sessionId || !interviewSessions.has(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    const session = interviewSessions.get(sessionId);
    
    if (!session.selectedRole) {
      return res.status(400).json({ error: 'No role selected for this session' });
    }

    // Add user answer to conversation history
    session.conversationHistory.push({ 
      role: 'user', 
      text: userAnswer,
      timestamp: new Date().toISOString()
    });

    const selectedRole = session.selectedRole;
    const roleKey = session.roleKey;
    const predefinedQuestionsForRole = PREDEFINED_QUESTIONS[roleKey];
    let nextQuestionText;

    // If using predefined questions and there are more questions
    if (session.currentQuestionIndex !== -1 && predefinedQuestionsForRole && session.currentQuestionIndex + 1 < predefinedQuestionsForRole.length && session.currentQuestionIndex + 1 < 10) {
      session.currentQuestionIndex++;
      nextQuestionText = predefinedQuestionsForRole[session.currentQuestionIndex].question;
      console.log('Using predefined next question:', nextQuestionText);
    } else {
      // If predefined questions are exhausted or not used, use fallback
      nextQuestionText = fallbackNextQuestion(selectedRole, session.conversationHistory);
      nextQuestionText = `(Fallback: No more predefined questions or AI unavailable) ${nextQuestionText}`;
      if (session.currentQuestionIndex !== -1) { // If it was using predefined questions, now it's switching to fallback
        session.currentQuestionIndex = -1; // Indicate AI-generated questions (or fallback)
      }
    }
    
    // Add AI response to conversation history
    session.conversationHistory.push({ 
      role: 'ai', 
      text: nextQuestionText,
      timestamp: new Date().toISOString()
    });

    res.json({ 
      success: true,
      nextQuestion: nextQuestionText,
      questionNumber: session.currentQuestionIndex !== -1 ? session.currentQuestionIndex + 1 : 'AI-generated'
    });
  } catch (error) {
    console.error('Error submitting answer (overall):', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// API endpoint to get interview feedback and summary
app.post('/api/get-feedback', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId || !interviewSessions.has(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    const session = interviewSessions.get(sessionId);
    
    if (!session.selectedRole) {
      return res.status(400).json({ error: 'No role selected for this session' });
    }

    const selectedRole = session.selectedRole;
    let feedback;
    // Always use fallback feedback since AI is unavailable
    feedback = fallbackFeedback(selectedRole, session.resumeText, session.conversationHistory);
    feedback = `(Fallback: AI unavailable for feedback) ${feedback}`;

    res.json({ 
      success: true,
      feedback: feedback,
      roleName: selectedRole.name,
      totalQuestions: session.currentQuestionIndex,
      sessionData: {
        fileName: session.fileName,
        uploadTime: session.uploadTime,
        interviewDuration: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating feedback (overall):', error);
    res.status(500).json({ error: 'Failed to generate feedback' });
  }
});

app.use('/.netlify/functions/server', app); // Required for Netlify serverless functions

module.exports.handler = serverless(app);

// app.listen(port, () => {
//   console.log(`Backend server listening at http://localhost:${port}`);
// });
