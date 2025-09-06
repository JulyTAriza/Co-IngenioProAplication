"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import GanttModal from "./GanttModal";
import { Project } from "./types";

export default function SchedulePage() {
  const [projects, setProjects] = useState<Project[]>([
    {
      id: "p1",
      name: "Construcción de Oficina",
      start: new Date(),
      end: new Date(new Date().setDate(new Date().getDate() + 30)),
      tasks: [],
    },
  ]);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleOpenGantt = (project: Project) => {
    setSelectedProject(project);
  };

  const handleSaveProject = (updated: Project) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    setSelectedProject(null);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Gestión de Cronogramas</h1>
      <div className="space-y-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="p-4 rounded-xl shadow bg-white flex justify-between items-center"
          >
            <div>
              <h2 className="font-semibold">{project.name}</h2>
              <p className="text-sm text-gray-500">
                {project.start.toLocaleDateString()} -{" "}
                {project.end.toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleOpenGantt(project)}>
                Ver Cronograma
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Button
          onClick={() =>
            setProjects((prev) => [
              ...prev,
              {
                id: `p${prev.length + 1}`,
                name: `Nuevo Proyecto ${prev.length + 1}`,
                start: new Date(),
                end: new Date(new Date().setDate(new Date().getDate() + 30)),
                tasks: [],
              },
            ])
          }
        >
          <PlusCircle className="mr-2" /> Crear Nuevo Cronograma
        </Button>
      </div>

      {selectedProject && (
        <GanttModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onSave={handleSaveProject}
        />
      )}
    </div>
  );
}
