import DashboardCarousel from "@/components/DashboardCarousel"
import LogoutButton from "@/components/LogoutButton"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-8 px-4">
        <div className="flex justify-end mb-2">
          <LogoutButton />
        </div>
        <h1 className="text-2xl font-bold mb-6 text-center md:text-3xl">
          Главный экран
        </h1>
        
        <DashboardCarousel />
        
        <p className="text-center text-muted-foreground mt-8 text-sm">
          Свайпайте карточки или нажмите на нужный раздел
        </p>
      </main>
    </div>
  )
}