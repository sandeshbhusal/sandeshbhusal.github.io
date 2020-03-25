# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name          = "Novela"
  spec.version       = "0.1.0"
  spec.authors       = ["Sandesh Bhusal"]
  spec.email         = ["073bct539@ioe.edu.np"]

  spec.summary       = "This is a theme I made during the qurantine duration of COVID-19. Hope you'll enjoy it!"
  spec.homepage      = "http://github.com/sandeshbhusal/Novela"
  spec.license       = "MIT"

  spec.files         = `git ls-files -z`.split("\x0").select { |f| f.match(%r!^(assets|_layouts|_includes|_sass|LICENSE|README)!i) }

  spec.add_runtime_dependency "jekyll", "~> 4.0"

  spec.add_development_dependency "bundler", "~> 2.1"
  spec.add_development_dependency "rake", "~> 12.0"
end
