// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-",
    title: "",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-blog",
          title: "Blog",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/blog/";
          },
        },{id: "post-building-smol-linux-image-for-reproducible-crashes",
      
        title: "Building smol Linux image for reproducible crashes",
      
      description: "How I (sometimes) debug issues with reproducible kernel issues",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/up-and-until-kernel-init/";
        
      },
    },{id: "post-gossip-glomers-efficient-broadcast",
      
        title: "Gossip Glomers - Efficient Broadcast",
      
      description: "My solutions to the Gossip Glomers challenge by fly.io",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/gossip-glomers/";
        
      },
    },{id: "post-writing-rewriting-a-lexer",
      
        title: "Writing (rewriting) a lexer",
      
      description: "A journey of writing a lexer for a simple language in Rust.",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/lexers/";
        
      },
    },{id: "post-writing-a-baremetal-bootloader-for-stm32-no-sdk",
      
        title: "Writing a Baremetal Bootloader for STM32 (no sdk)",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/tinkering-with-stm32/";
        
      },
    },{id: "post-binary-search-is-bananas",
      
        title: "Binary search is Bananas!",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2023/binary-search/";
        
      },
    },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
