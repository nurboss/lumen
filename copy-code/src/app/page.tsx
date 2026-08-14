import Link from "next/link";
import { ArrowRight, Star, Truck, Heart, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Navbar } from "@/components/navbar";
import { cn } from "@/lib/utils";

const categories = [
  { emoji: "🐕", label: "Dogs", count: 120, color: "from-amber-100 to-amber-50 dark:from-amber-950 dark:to-amber-900" },
  { emoji: "🐈", label: "Cats", count: 95, color: "from-purple-100 to-purple-50 dark:from-purple-950 dark:to-purple-900" },
  { emoji: "🐦", label: "Birds", count: 60, color: "from-sky-100 to-sky-50 dark:from-sky-950 dark:to-sky-900" },
  { emoji: "🐠", label: "Fish", count: 80, color: "from-blue-100 to-blue-50 dark:from-blue-950 dark:to-blue-900" },
  { emoji: "🐇", label: "Rabbits", count: 40, color: "from-pink-100 to-pink-50 dark:from-pink-950 dark:to-pink-900" },
  { emoji: "🦎", label: "Reptiles", count: 30, color: "from-green-100 to-green-50 dark:from-green-950 dark:to-green-900" },
];

const products = [
  {
    name: "Premium Dog Food",
    category: "Nutrition",
    price: 29.99,
    rating: 4.8,
    reviews: 342,
    badge: "Best Seller",
    gradient: "from-amber-400 to-orange-500",
    emoji: "🦴",
  },
  {
    name: "Cat Tree Tower",
    category: "Accessories",
    price: 89.99,
    rating: 4.7,
    reviews: 218,
    badge: "New",
    gradient: "from-purple-400 to-pink-500",
    emoji: "🌳",
  },
  {
    name: "Aquarium Starter Kit",
    category: "Fish",
    price: 59.99,
    rating: 4.6,
    reviews: 156,
    badge: "Sale",
    gradient: "from-blue-400 to-cyan-500",
    emoji: "🐟",
  },
  {
    name: "Bird Swing & Perch",
    category: "Birds",
    price: 19.99,
    rating: 4.9,
    reviews: 89,
    badge: null,
    gradient: "from-sky-400 to-indigo-500",
    emoji: "🦜",
  },
];

const features = [
  { icon: Truck, title: "Free Delivery", desc: "On orders over $50 — delivered to your door." },
  { icon: Heart, title: "Healthy Pets", desc: "All animals are vet-checked and vaccinated." },
  { icon: Shield, title: "Safe & Secure", desc: "100% satisfaction guarantee on every purchase." },
  { icon: Clock, title: "24/7 Support", desc: "Expert pet care advice whenever you need it." },
];

const stats = [
  { value: "500+", label: "Happy Pets" },
  { value: "1,200+", label: "Products" },
  { value: "8,000+", label: "Customers" },
  { value: "15+", label: "Years of Care" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/20 pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="mb-4 text-sm font-medium">
              🐾 Welcome to PetHaven
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Find Your{" "}
              <span className="text-primary">Perfect</span>{" "}
              Companion
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl">
              Discover thousands of pets, premium food, accessories, and expert care — all in one place. Your pet deserves the best.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/shop" className={cn(buttonVariants({ size: "lg" }))}>
                Shop Now <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link href="/pets" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
                Browse Pets
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hero decorative */}
          <div className="absolute right-0 top-0 -z-10 hidden lg:block h-full w-1/2 pointer-events-none">
            <div className="absolute right-8 top-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute right-24 top-1/3 text-9xl select-none animate-bounce" style={{ animationDuration: "3s" }}>
              🐕
            </div>
            <div className="absolute right-4 bottom-1/3 text-7xl select-none animate-bounce" style={{ animationDuration: "4s", animationDelay: "1s" }}>
              🐈
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-1">Browse</p>
            <h2 className="text-3xl font-bold text-foreground">Shop by Category</h2>
          </div>
          <Link href="/pets" className={cn(buttonVariants({ variant: "ghost" }))}>
            View all <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((cat) => (
            <Link
              key={cat.label}
              href={`/pets?category=${cat.label.toLowerCase()}`}
              className="group"
            >
              <Card className={`bg-gradient-to-b ${cat.color} border-0 transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer`}>
                <CardContent className="flex flex-col items-center justify-center py-8 gap-2">
                  <span className="text-4xl group-hover:scale-110 transition-transform duration-200">
                    {cat.emoji}
                  </span>
                  <p className="font-semibold text-foreground text-sm">{cat.label}</p>
                  <p className="text-xs text-muted-foreground">{cat.count} pets</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <Separator />

      {/* Featured Products */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-1">Top Picks</p>
            <h2 className="text-3xl font-bold text-foreground">Featured Products</h2>
          </div>
          <Link href="/shop" className={cn(buttonVariants({ variant: "ghost" }))}>
            See all <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <Card key={product.name} className="group overflow-hidden hover:shadow-lg transition-shadow duration-200">
              <div className={`relative h-48 bg-gradient-to-br ${product.gradient} flex items-center justify-center`}>
                <span className="text-6xl">{product.emoji}</span>
                {product.badge && (
                  <Badge
                    className="absolute top-3 left-3"
                    variant={product.badge === "Sale" ? "destructive" : "secondary"}
                  >
                    {product.badge}
                  </Badge>
                )}
              </div>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
                <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {product.name}
                </h3>
                <div className="flex items-center gap-1 mb-3">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-medium">{product.rating}</span>
                  <span className="text-xs text-muted-foreground">({product.reviews})</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-foreground">${product.price}</p>
                  <Button size="sm" variant="outline">Add to Cart</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Promo Banner */}
      <section className="mx-4 mb-16 sm:mx-6 lg:mx-8 rounded-2xl overflow-hidden bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-8 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <Badge variant="secondary" className="mb-3 text-foreground">Limited Offer</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold">Get 20% off your first order</h2>
            <p className="mt-2 text-primary-foreground/70">
              Use code <strong className="text-primary-foreground">PETHAVEN20</strong> at checkout.
            </p>
          </div>
          <Link href="/shop" className={cn(buttonVariants({ size: "lg", variant: "secondary" }))}>
            Claim Offer <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-1">Why Us</p>
          <h2 className="text-3xl font-bold text-foreground">Why Choose PetHaven</h2>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="flex flex-col items-center text-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <feature.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* Newsletter */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-1">Stay Updated</p>
        <h2 className="text-3xl font-bold text-foreground mb-3">Join Our Newsletter</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Get pet care tips, exclusive deals, and new arrival alerts straight to your inbox.
        </p>
        <form className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto sm:max-w-md">
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 rounded-md border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
          <Button type="submit">Subscribe</Button>
        </form>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 font-bold text-lg mb-3">
                🐾 PetHaven
              </Link>
              <p className="text-sm text-muted-foreground">
                Your one-stop destination for all things pets.
              </p>
            </div>
            {[
              { title: "Shop", links: ["All Pets", "Food & Treats", "Accessories", "Health Care"] },
              { title: "Company", links: ["About Us", "Careers", "Blog", "Press"] },
              { title: "Support", links: ["FAQ", "Shipping", "Returns", "Contact"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="font-semibold text-foreground mb-3 text-sm">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Separator className="my-8" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© 2026 PetHaven. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
