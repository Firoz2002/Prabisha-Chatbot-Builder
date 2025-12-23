import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus } from "lucide-react"

export default function KnowledgePage() {
  const features = [
    {
      icon: "🔗",
      title: "Sync Google Docs and Notion",
      description: "Connect pages and docs from these apps to your chatbot. Advanced plan only.",
    },
    {
      icon: "🌐",
      title: "Crawl webpages",
      description: "Scrape the content from public URLs like your website or help center.",
    },
    {
      icon: "📄",
      title: "Upload files",
      description: "Add key background info from text-based files such as .txt, .csv, .pdf, .doc. Up to 2MB each.",
    },
    {
      icon: "📊",
      title: "Connect Tables",
      description:
        "Sync frequently asked questions and resources stored in a Zapier Table. 10,000 rows each. Syncs automatically daily.",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column */}
          <div className="lg:col-span-2">
            {/* Header Section */}
            <div className="mb-12">
              <h1 className="text-4xl font-bold mb-6 flex items-center gap-3">
                <span className="text-2xl">📚</span>
                Connect custom knowledge
              </h1>

              <p className="text-lg text-foreground/80 mb-6 leading-relaxed">
                Train your{" "}
                <a href="#" className="text-blue-600 hover:underline font-medium">
                  chatbot on knowledge
                </a>{" "}
                that is unique to your project or business so it can provide accurate answers instantly — responding
                just like you would.
              </p>

              <p className="text-base text-foreground/70 mb-8 leading-relaxed">
                Start by connecting public links, tables, and files — up to 500KB on Pro and 50MB on Advanced for each
                Chatbot. Then, set a sync schedule to keep everything up to date. Finally, define fallback logic for
                when answers aren't found.
              </p>

              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="w-5 h-5 mr-2" />
                Add your first knowledge source
              </Button>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="p-6 border border-border hover:border-border/80 transition-colors">
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">{feature.icon}</span>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                      <p className="text-foreground/70 text-sm leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Right Column - Promotional Image */}
          <div className="hidden lg:flex items-start justify-end">
            <div className="relative">
              <img
                src="/images/image.png"
                alt="Zapier chatbots promotion showing automatic updates"
                className="w-full max-w-sm rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
