// pages/cronograma/[id]/gantt.tsx
"use client";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import GanttChart from "./GanttChart";
import { Project } from "./types";

export default function GanttFullView() {
  const router = useRouter();
  const { id } = router.query;
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    const storedProjects = JSON.parse(localStorage.getItem("projects") || "[]");
    const found = storedProjects.find((p: Project) => p.id === id);
    setProject(found || null);
  }, [id]);

  if (!project) return <div className="p-6">Cargando proyecto...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Cronograma — {project.name}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {project.start.toLocaleDateString()} → {project.end.toLocaleDateString()}
      </p>
      <GanttChart
        tasks={project.tasks}
        view={"Month"}
        onDateChange={() => {}}
        onProgressChange={() => {}}
      />
    </div>
  );
}
