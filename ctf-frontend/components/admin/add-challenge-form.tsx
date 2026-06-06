"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Server,
  FileText,
  X,
  Upload,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { createChallenge } from "@/lib/api/admin";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const challengeFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  points: z.number().min(1, "Points must be at least 1"),
  flag: z.string().optional(),
  file: z
    .any()
    .refine((val) => {
      if (!val) return true;
      return val instanceof File;
    }, "Please select a valid file")
    .optional(),
  requiresInstance: z.boolean().default(false),
  hints: z.array(z.string()).optional(),
});

type ChallengeFormValues = z.infer<typeof challengeFormSchema>;

const ACCEPTED_DOCKER_FILES = [
  ".dockerfile",
  ".Dockerfile",
  ".sh",
  ".c",
  ".cpp",
  ".py",
  ".js",
  ".txt",
  ".md",
  ".yml",
  ".yaml",
  ".json",
];

export default function AddChallengeForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [dockerFiles, setDockerFiles] = useState<File[]>([]);
  const [hints, setHints] = useState<string[]>([]);
  const [newHint, setNewHint] = useState("");
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const { toast } = useToast();

  const form = useForm<ChallengeFormValues>({
    resolver: zodResolver(challengeFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      difficulty: "easy",
      points: 100,
      flag: "",
      requiresInstance: false,
    },
  });

  const requiresInstance = form.watch("requiresInstance");
  const formValues = form.watch();

  const handleDockerFileChange = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter((file) => {
      const name = file.name;
      const lower = name.toLowerCase();
      const dotIndex = name.lastIndexOf(".");
      const extension = dotIndex !== -1 ? lower.substring(dotIndex) : "";
      const isDockerfile = name === "Dockerfile" || lower === "dockerfile";
      return ACCEPTED_DOCKER_FILES.includes(extension) || isDockerfile;
    });
    setDockerFiles((prev) => [...prev, ...newFiles]);
  };

  const removeDockerFile = (index: number) => {
    setDockerFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileName: string) => {
    if (fileName === "Dockerfile" || fileName.endsWith(".dockerfile"))
      return "";
    if (fileName.endsWith(".sh")) return "";
    if (fileName.endsWith(".c") || fileName.endsWith(".cpp")) return "";
    if (fileName.endsWith(".py")) return "";
    if (fileName.endsWith(".js")) return "";
    if (fileName.endsWith(".md")) return "";
    return "";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const valid = await form.trigger([
        "title",
        "description",
        "category",
        "difficulty",
        "points",
      ]);
      if (valid) setCurrentStep(3);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleCreateChallenge = async (data: ChallengeFormValues) => {
    setIsLoading(true);
    setShowSuccessAlert(false);

    try {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("category", data.category);
      formData.append("difficulty", data.difficulty);
      formData.append("points", data.points.toString());

      if (data.flag) formData.append("flag", data.flag);
      if (data.file) formData.append("downloadFile", data.file);

      formData.append(
        "requiresInstance",
        data.requiresInstance ? "true" : "false",
      );
      if (data.requiresInstance) {
        dockerFiles.forEach((file) => formData.append("dockerFiles", file));
      }

      hints.forEach((hint) => formData.append("hints", hint));

      await createChallenge(formData);

      toast({
        title: "Challenge Created Successfully!",
        description: `"${data.title}" has been added to the platform and is now available to players.`,
        duration: 5000,
      });

      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 5000);

      form.reset({
        title: "",
        description: "",
        category: "",
        difficulty: "easy",
        points: 100,
        flag: "",
        requiresInstance: false,
      });
      setDockerFiles([]);
      setCurrentStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Challenge creation error:", error);
      toast({
        title: "Error Creating Challenge",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again.",
        variant: "destructive",
        duration: 7000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { num: 1, label: "Type" },
    { num: 2, label: "Configure" },
    { num: 3, label: "Review" },
  ];

  return (
    <div className="space-y-4">
      {showSuccessAlert && (
        <Alert className="bg-green-50 border-green-200 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <AlertDescription className="text-green-800 font-medium">
            Challenge created successfully! The challenge is now live on the
            platform.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-center gap-0">
        {steps.map((step, i) => (
          <div key={step.num} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
                currentStep === step.num
                  ? "bg-primary text-primary-foreground font-medium"
                  : currentStep > step.num
                    ? "text-muted-foreground"
                    : "text-muted-foreground/50",
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium",
                  currentStep === step.num
                    ? "bg-primary-foreground/20"
                    : currentStep > step.num
                      ? "bg-primary/10"
                      : "bg-muted",
                )}
              >
                {currentStep > step.num ? "\u2713" : step.num}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "w-8 h-px mx-1",
                  currentStep > step.num ? "bg-primary/30" : "bg-border",
                )}
              />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Challenge</CardTitle>
          <CardDescription>
            {currentStep === 1 &&
              "Select the type of challenge you want to create"}
            {currentStep === 2 && "Configure the challenge details and content"}
            {currentStep === 3 && "Review your challenge before publishing"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              {currentStep === 1 && (
                <div className="space-y-4">
                  <p className="text-sm font-medium">
                    What type of challenge are you creating?
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => form.setValue("requiresInstance", false)}
                      className={cn(
                        "relative flex flex-col items-start p-6 rounded-xl border-2 text-left transition-all",
                        !requiresInstance
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-muted-foreground/30",
                      )}
                    >
                      {!requiresInstance && (
                        <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-primary" />
                      )}
                      <FileText className="h-8 w-8 mb-3 text-foreground" />
                      <h3 className="font-semibold mb-1">Static Challenge</h3>
                      <p className="text-sm text-muted-foreground">
                        Players submit a flag to solve this challenge. No
                        container needed.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => form.setValue("requiresInstance", true)}
                      className={cn(
                        "relative flex flex-col items-start p-6 rounded-xl border-2 text-left transition-all",
                        requiresInstance
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-muted-foreground/30",
                      )}
                    >
                      {requiresInstance && (
                        <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-primary" />
                      )}
                      <Server className="h-8 w-8 mb-3 text-foreground" />
                      <h3 className="font-semibold mb-1">
                        Dynamic Docker Challenge
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Each player gets a dedicated Docker container with SSH
                        access. Flag is auto-generated.
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Buffer Overflow Challenge"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="binary-exploitation">
                                Binary Exploitation
                              </SelectItem>
                              <SelectItem value="web-exploitation">
                                Web Exploitation
                              </SelectItem>
                              <SelectItem value="cryptography">
                                Cryptography
                              </SelectItem>
                              <SelectItem value="reverse-engineering">
                                Reverse Engineering
                              </SelectItem>
                              <SelectItem value="forensics">
                                Forensics
                              </SelectItem>
                              <SelectItem value="linux-basics">
                                Linux Basics
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the challenge and what players need to do..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="difficulty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Difficulty</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select difficulty" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="points"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Points</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="100"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value) || 0)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {!requiresInstance && (
                      <FormField
                        control={form.control}
                        name="flag"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Flag</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="FLAG{example_flag}"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {!requiresInstance && (
                    <FormField
                      control={form.control}
                      name="file"
                      render={({ field: { value, onChange, ...field } }) => (
                        <FormItem>
                          <FormLabel>Download File (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              type="file"
                              accept="*"
                              onChange={(e) => onChange(e.target.files?.[0])}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Upload files for static challenges (zip, pdf, etc.)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {requiresInstance && (
                    <div className="space-y-4 border rounded-lg p-6 bg-muted/30">
                      <div className="space-y-2">
                        <FormLabel className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Docker Challenge Files
                        </FormLabel>
                        <FormDescription>
                          Upload Dockerfile, source code, scripts, and other
                          files needed for the challenge
                        </FormDescription>
                      </div>

                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 hover:border-primary/50 transition-colors">
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <div className="text-center">
                            <p className="text-sm font-medium">
                              Drag & drop files here, or click to browse
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Accepted: Dockerfile, .sh, .c, .cpp, .py, .js,
                              .txt, .md
                            </p>
                          </div>
                          <Input
                            type="file"
                            multiple
                            accept="*"
                            onChange={(e) =>
                              handleDockerFileChange(e.target.files)
                            }
                          />
                        </div>
                      </div>

                      {dockerFiles.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              Uploaded Files ({dockerFiles.length})
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setDockerFiles([])}
                              className="text-destructive hover:text-destructive/80"
                            >
                              Clear All
                            </Button>
                          </div>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {dockerFiles.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-background border rounded-lg hover:bg-accent/50 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-lg">
                                    {getFileIcon(file.name)}
                                  </span>
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium truncate max-w-[200px]">
                                      {file.name}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {formatFileSize(file.size)}
                                      </Badge>
                                      <Badge
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {file.name
                                          .split(".")
                                          .pop()
                                          ?.toUpperCase() || "FILE"}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeDockerFile(index)}
                                  className="h-8 w-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Add a hint..."
                        value={newHint}
                        onChange={(e) => setNewHint(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newHint.trim()) {
                            e.preventDefault();
                            e.stopPropagation();
                            setHints([...hints, newHint.trim()]);
                            setNewHint("");
                          }
                        }}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          if (newHint.trim()) {
                            setHints([...hints, newHint.trim()]);
                            setNewHint("");
                          }
                        }}
                        disabled={!newHint.trim()}
                      >
                        Add Hint
                      </Button>
                    </div>
                    {hints.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Hints ({hints.length}):
                        </p>
                        {hints.map((hint, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-muted rounded"
                          >
                            <span className="text-sm">{hint}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setHints(hints.filter((_, i) => i !== index))
                              }
                              className="h-6 w-6 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        Challenge Type
                      </p>
                      <div className="flex items-center gap-2">
                        {requiresInstance ? (
                          <>
                            <Server className="h-4 w-4" />
                            <span className="font-medium">
                              Dynamic Docker Challenge
                            </span>
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4" />
                            <span className="font-medium">
                              Static Challenge
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        Difficulty
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          formValues.difficulty === "easy" &&
                            "border-green-300 text-green-700 bg-green-50",
                          formValues.difficulty === "medium" &&
                            "border-yellow-300 text-yellow-700 bg-yellow-50",
                          formValues.difficulty === "hard" &&
                            "border-red-300 text-red-700 bg-red-50",
                        )}
                      >
                        {formValues.difficulty?.charAt(0).toUpperCase() +
                          formValues.difficulty?.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      Title
                    </p>
                    <p className="font-semibold text-lg">{formValues.title}</p>
                  </div>

                  <div className="p-4 border rounded-lg space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      Category
                    </p>
                    <p className="text-sm capitalize">
                      {formValues.category
                        ? formValues.category.replace(/-/g, " ")
                        : "-"}
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      Description
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formValues.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        Points
                      </p>
                      <p className="text-2xl font-bold">{formValues.points}</p>
                    </div>
                    {!requiresInstance && formValues.flag && (
                      <div className="p-4 border rounded-lg space-y-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                          Flag
                        </p>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {formValues.flag}
                        </code>
                      </div>
                    )}
                    {requiresInstance && (
                      <div className="p-4 border rounded-lg space-y-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                          Docker Files
                        </p>
                        <p className="text-sm">
                          {dockerFiles.length} file
                          {dockerFiles.length !== 1 ? "s" : ""} uploaded
                        </p>
                      </div>
                    )}
                  </div>

                  {hints.length > 0 && (
                    <div className="p-4 border rounded-lg space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        Hints ({hints.length})
                      </p>
                      <ul className="space-y-1">
                        {hints.map((hint, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <span className="text-muted-foreground/40 mt-0.5">
                              -
                            </span>
                            {hint}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                {currentStep > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevious}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" /> Previous
                  </Button>
                ) : (
                  <div />
                )}
                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2"
                  >
                    Next <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={isLoading}
                    onClick={form.handleSubmit(handleCreateChallenge)}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating...
                      </span>
                    ) : (
                      "Create Challenge"
                    )}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
