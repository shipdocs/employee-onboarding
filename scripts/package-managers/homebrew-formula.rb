class MaritimeOnboarding < Formula
  desc "Maritime crew onboarding and training management system"
  homepage "https://github.com/shipdocs/employee-onboarding"
  url "https://github.com/shipdocs/employee-onboarding/archive/v2.0.1.tar.gz"
  sha256 "REPLACE_WITH_ACTUAL_SHA256"
  license "MIT"

  depends_on "docker"
  depends_on "docker-compose"
  depends_on "node@20"

  def install
    # Install the application
    libexec.install Dir["*"]
    
    # Create wrapper script
    (bin/"maritime-onboarding").write <<~EOS
      #!/bin/bash
      cd "#{libexec}"
      exec ./scripts/install.sh "$@"
    EOS
    
    # Create management commands
    (bin/"maritime-start").write <<~EOS
      #!/bin/bash
      cd "#{libexec}"
      docker-compose up -d
    EOS
    
    (bin/"maritime-stop").write <<~EOS
      #!/bin/bash
      cd "#{libexec}"
      docker-compose down
    EOS
    
    (bin/"maritime-logs").write <<~EOS
      #!/bin/bash
      cd "#{libexec}"
      docker-compose logs -f "$@"
    EOS
    
    (bin/"maritime-update").write <<~EOS
      #!/bin/bash
      cd "#{libexec}"
      git pull origin main
      docker-compose pull
      docker-compose up -d
    EOS
  end

  def post_install
    puts <<~EOS
      🚢 Maritime Onboarding Platform installed successfully!
      
      Quick start:
        maritime-onboarding
      
      Management commands:
        maritime-start    # Start services
        maritime-stop     # Stop services  
        maritime-logs     # View logs
        maritime-update   # Update to latest version
      
      Access the application at: http://localhost
      
      For more information, visit:
      https://github.com/shipdocs/employee-onboarding
    EOS
  end

  test do
    system "#{bin}/maritime-onboarding", "--help"
  end
end
