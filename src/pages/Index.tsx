// Update this page (the content is just a fallback if you fail to update the page)
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, Heart, StethoscopeIcon as Stethoscope } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-primary rounded-full">
              <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L9 7V9H21M21 19V11H9V19H21M19 13V17H11V13H19Z"/>
              </svg>
            </div>
            <h1 className="text-5xl font-bold text-primary">MediAid</h1>
          </div>
          <h2 className="text-3xl font-bold mb-4 text-foreground">
            Smart Healthcare Management System
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Advanced AI-powered medical report analysis, secure patient management, 
            and comprehensive healthcare solutions all in one platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/login"
              className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              Sign In
            </a>
            <a 
              href="/signup"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-8 py-3 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Create Account
            </a>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center p-6 rounded-lg border bg-card">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Report Analysis</h3>
            <p className="text-muted-foreground">
              Upload medical reports and get instant AI-powered analysis with disease detection and health insights.
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border bg-card">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0a4 4 0 11-8-2.828" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Multi-Role Access</h3>
            <p className="text-muted-foreground">
              Dedicated dashboards for patients, doctors, and staff with role-based access and features.
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border bg-card">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
            <p className="text-muted-foreground">
              Enterprise-grade security with encrypted data storage and HIPAA-compliant infrastructure.
            </p>
          </div>
        </div>

        {/* Dashboard Access Section */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-4">Choose Your Dashboard</h3>
            <p className="text-muted-foreground">Access your personalized healthcare dashboard</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center p-8 hover:shadow-lg transition-shadow">
              <div className="bg-blue-100 dark:bg-blue-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Patient Dashboard</h3>
              <p className="text-muted-foreground mb-4">Upload medical reports and get AI-powered health insights</p>
              <Button asChild variant="outline">
                <Link to="/dashboard/patient">Access Dashboard</Link>
              </Button>
            </Card>

            <Card className="text-center p-8 hover:shadow-lg transition-shadow">
              <div className="bg-green-100 dark:bg-green-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Staff Dashboard</h3>
              <p className="text-muted-foreground mb-4">Monitor patients and trigger emergency alerts when needed</p>
              <Button asChild variant="outline">
                <Link to="/dashboard/staff">Staff Access</Link>
              </Button>
            </Card>

            <Card className="text-center p-8 hover:shadow-lg transition-shadow">
              <div className="bg-red-100 dark:bg-red-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Stethoscope className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Doctor Dashboard</h3>
              <p className="text-muted-foreground mb-4">Receive real-time emergency alerts and manage critical cases</p>
              <Button asChild variant="outline">
                <Link to="/dashboard/doctor">Doctor Access</Link>
              </Button>
            </Card>
          </div>
        </div>

        {/* Stats Section */}
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-8">Trusted by Healthcare Professionals</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">10K+</div>
              <div className="text-muted-foreground">Reports Analyzed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">500+</div>
              <div className="text-muted-foreground">Healthcare Providers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">98%</div>
              <div className="text-muted-foreground">Accuracy Rate</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">Support Available</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
