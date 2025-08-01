
"use client";

import type { Editor as MonacoEditor } from "monaco-editor";
import Editor from "@monaco-editor/react";
import JSZip from "jszip";
import React, { useCallback, useRef, useState, type FC } from "react";
import {
  File,
  Folder,
  FolderOpen,
  LoaderCircle,
  Search,
  Sparkles,
  UploadCloud,
  Wand2,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { fixCodeError, getCodeExplanation, searchCode } from "@/lib/actions";
import type { FileNode, FileContents } from "@/lib/types";
import type { ErrorAutoFixOutput } from "@/ai/flows/error-auto-fix";
import type { NaturalLanguageCodeSearchOutput } from "@/ai/flows/natural-language-code-search";
import { CodePilotLogo } from "../icons";

const FileTreeItem: FC<{
  node: FileNode;
  onSelect: (path: string) => void;
  selectedPath: string;
}> = ({ node, onSelect, selectedPath }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (node.type === "folder") {
    return (
      <div className="ml-4">
        <div
          className="flex items-center cursor-pointer py-1"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <FolderOpen className="w-4 h-4 mr-2 text-primary" />
          ) : (
            <Folder className="w-4 h-4 mr-2 text-primary" />
          )}
          <span>{node.name}</span>
        </div>
        {isOpen &&
          node.children?.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center cursor-pointer py-1 ml-4 ${
        selectedPath === node.path ? "bg-primary/10 rounded-md" : ""
      }`}
      onClick={() => onSelect(node.path)}
    >
      <File className="w-4 h-4 mr-2 text-muted-foreground" />
      <span>{node.name}</span>
    </div>
  );
};

export function CodePilotAI() {
  const { toast } = useToast();
  const editorRef = useRef<MonacoEditor | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<JSZip | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [aiTask, setAiTask] = useState<string | null>(null);

  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [fileContents, setFileContents] = useState<FileContents>({});
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [activeFileContent, setActiveFileContent] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] =
    useState<NaturalLanguageCodeSearchOutput | null>(null);

  const [explanation, setExplanation] = useState<string | null>(null);

  const [errorCode, setErrorCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorFix, setErrorFix] = useState<ErrorAutoFixOutput | null>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setAiTask("Processing codebase...");

    try {
      const zip = await JSZip.loadAsync(file);
      zipRef.current = zip;

      const fileTree: FileNode = { name: "root", type: "folder", path: "", children: [] };
      const contents: FileContents = {};
      const codeFileExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.cs', '.rb', '.php', '.html', '.css', '.scss', '.json', '.md'];

      for (const path in zip.files) {
        const file = zip.files[path];
        if (!file.dir && codeFileExtensions.some(ext => path.endsWith(ext))) {
          contents[path] = await file.async("text");

          let currentNode = fileTree;
          const parts = path.split("/").filter((p) => p);
          parts.forEach((part, index) => {
            const isFile = index === parts.length - 1;
            const currentPath = parts.slice(0, index + 1).join("/");
            let childNode = currentNode.children?.find((n) => n.name === part);
            if (!childNode) {
              childNode = {
                name: part,
                type: isFile ? "file" : "folder",
                path: currentPath,
                children: isFile ? undefined : [],
              };
              currentNode.children?.push(childNode);
            }
            currentNode = childNode;
          });
        }
      }

      setFileContents(contents);
      setFileTree(fileTree);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Could not process the ZIP file.",
      });
    } finally {
      setIsLoading(false);
      setAiTask(null);
    }
  };

  const handleReupload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (path: string) => {
    setActiveFile(path);
    setActiveFileContent(fileContents[path] || "Error reading file.");
    setSearchResult(null); // Clear search results when selecting a file
  };

  const handleEditorDidMount = (editor: MonacoEditor) => {
    editorRef.current = editor;
  };

  const performSearch = async () => {
    if (!searchQuery) return;
    setIsLoading(true);
    setAiTask("Searching code...");
    setSearchResult(null);

    try {
      // Find all files that contain the search query.
      const matchingFiles = Object.entries(fileContents)
        .filter(([, content]) =>
          content.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .map(([path, content]) => `File: ${path}\n\n${content}`)
        .join("\n\n---\n\n");

      if (matchingFiles) {
        try {
          const result = await searchCode({
            query: searchQuery,
            codeSnippet: matchingFiles,
          });
          setSearchResult(result);
          setActiveFile("Search Result");
          setActiveFileContent(result.relevantCode);
        } catch (aiError) {
          console.error("AI search failed, falling back.", aiError);
          setSearchResult({
            relevantCode: "Error: The AI could not process the search request.",
            explanation: "An error occurred while trying to analyze the code.",
          });
          setActiveFile("Search Result (Error)");
          setActiveFileContent(
            "Error: The AI could not process the search request."
          );
        }
      } else {
        setSearchResult({
          relevantCode: "No relevant code found.",
          explanation: "Could not find any code matching your query.",
        });
        setActiveFile("Search Result");
        setActiveFileContent("No relevant code found.");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Search failed",
        description: "An error occurred during the search.",
      });
    }
    setIsLoading(false);
    setAiTask(null);
  };

  const performExplanation = async () => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = editor.getSelection();
    if (!selection || selection.isEmpty()) {
      toast({
        title: "No code selected",
        description: "Please select a code block to explain.",
      });
      return;
    }

    const code = editor.getModel()?.getValueInRange(selection);
    if (!code) return;

    setIsLoading(true);
    setAiTask("Generating explanation...");
    setExplanation(null);
    try {
      const result = await getCodeExplanation({ code });
      setExplanation(result.explanation);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Explanation failed",
        description: "Could not generate an explanation.",
      });
    }
    setIsLoading(false);
    setAiTask(null);
  };

  const performErrorFix = async () => {
    if (!errorMessage || !errorCode) {
      toast({
        title: "Missing information",
        description: "Please provide both an error message and a code snippet.",
      });
      return;
    }
    setIsLoading(true);
    setAiTask("Analyzing error...");
    setErrorFix(null);
    try {
      const result = await fixCodeError({
        errorMessage,
        codeSnippet: errorCode,
      });
      setErrorFix(result);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to get fix",
        description: "Could not generate a fix for the error.",
      });
    }
    setIsLoading(false);
    setAiTask(null);
  };
  
  const initialContent = (
    <div
      className="flex flex-col items-center justify-center w-full p-12 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted/50 transition-colors"
      onClick={() => fileInputRef.current?.click()}
    >
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
        <UploadCloud className="w-8 h-8 text-primary" />
      </div>
      <p className="mt-4 text-lg font-semibold">
        Upload your codebase
      </p>
      <p className="text-sm text-muted-foreground">
        Drop a ZIP file here or click to select
      </p>
      <Input
        type="file"
        accept=".zip"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );

  if (!fileTree) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 font-sans">
        <Card className="w-full max-w-lg text-center shadow-lg border-none">
          <CardHeader>
            <div className="flex items-center justify-center gap-3 mb-4">
              <CodePilotLogo className="w-10 h-10" />
              <h1 className="text-3xl font-headline">CodePilot AI</h1>
            </div>
            <p className="text-muted-foreground">
              Your AI-Powered Code Search & Assistant
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <LoaderCircle className="w-12 h-12 animate-spin text-primary" />
                <p className="text-lg">{aiTask || "Loading..."}</p>
              </div>
            ) : (
             initialContent
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[300px_1fr_400px] h-screen bg-background font-sans">
      {/* Hidden file input for reuse */}
      <Input
        type="file"
        accept=".zip"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileUpload}
      />
      <div className="flex flex-col border-r bg-card">
        <header className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CodePilotLogo className="w-6 h-6" />
            <h2 className="text-xl font-headline">CodePilot AI</h2>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleReupload} className="h-8 w-8">
                  <UploadCloud className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Re-upload codebase</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </header>
        <div className="flex-1 overflow-y-auto">
          {fileTree && (
            <FileTreeItem
              node={fileTree}
              onSelect={handleFileSelect}
              selectedPath={activeFile || ""}
            />
          )}
        </div>
      </div>
      <div className="flex flex-col">
        <div className="p-2 border-b text-sm text-muted-foreground">
          {activeFile || "No file selected"}
        </div>
        <Editor
          height="calc(100vh - 41px)"
          language="typescript"
          theme="vs-dark"
          path={activeFile || ""}
          value={activeFileContent}
          onMount={handleEditorDidMount}
          options={{ readOnly: false, minimap: { enabled: true } }}
        />
      </div>
      <div className="border-l bg-card">
        <Tabs defaultValue="search" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 m-2">
            <TabsTrigger value="search">
              <Search className="w-4 h-4 mr-2" />
              Search
            </TabsTrigger>
            <TabsTrigger value="explain">
              <Sparkles className="w-4 h-4 mr-2" />
              Explain
            </TabsTrigger>
            <TabsTrigger value="fix">
              <Wand2 className="w-4 h-4 mr-2" />
              Fix
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="search" className="p-4">
              <Card>
                <CardHeader>
                  <CardTitle>Keyword Search</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="e.g., 'list all tasks'"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Button
                    onClick={performSearch}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading && aiTask === "Searching code..." ? (
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    Search Codebase
                  </Button>
                  {searchResult && (
                    <Alert>
                      <AlertTitle>Explanation</AlertTitle>
                      <AlertDescription>
                        <p>{searchResult.explanation}</p>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="explain" className="p-4">
              <Card>
                <CardHeader>
                  <CardTitle>AI Code Explanation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Select a block of code in the editor and click the button
                    below to get an explanation.
                  </p>
                  <Button
                    onClick={performExplanation}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading && aiTask === "Generating explanation..." ? (
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Explain Selected Code
                  </Button>
                  {explanation && (
                    <Alert>
                      <AlertTitle>Explanation</AlertTitle>
                      <AlertDescription>
                        <p>{explanation}</p>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fix" className="p-4">
              <Card>
                <CardHeader>
                  <CardTitle>Error Auto-Fix</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Paste your error message here..."
                    value={errorMessage}
                    onChange={(e) => setErrorMessage(e.target.value)}
                  />
                  <Textarea
                    rows={8}
                    placeholder="Paste the relevant code snippet here..."
                    className="font-code"
                    value={errorCode}
                    onChange={(e) => setErrorCode(e.target.value)}
                  />
                  <Button
                    onClick={performErrorFix}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading && aiTask === "Analyzing error..." ? (
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="mr-2 h-4 w-4" />
                    )}
                    Get Suggested Fix
                  </Button>
                  {errorFix && (
                    <Alert>
                      <AlertTitle>Suggested Fix</AlertTitle>
                      <AlertDescription>
                        <p className="font-bold mb-2">Explanation:</p>
                        <p className="mb-4">{errorFix.explanation}</p>
                        <p className="font-bold mb-2">Fixed Code:</p>
                        <pre className="p-2 mt-2 text-xs bg-muted rounded-md font-code whitespace-pre-wrap">
                          <code>{errorFix.fixedCode}</code>
                        </pre>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
