
"use client"
import {useRef,useEffect,useState,useCallback} from "react"
import { initDraw } from "@/draw";
import { IconButton } from "./IconButton";
import {X, Puzzle,WandSparkles, MousePointer,Circle, Hand,Pencil, RectangleHorizontalIcon, Type ,Eraser, Triangle, AlignCenter,LogOut,MoveRight, Minus, Icon,ZoomIn,ZoomOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Shape } from "@/draw";
import axiosWithAuth from "./apiwithauth";
import { http_backend } from "@/config";
import toast from "react-hot-toast";
import { generateImageFromSelection } from "@/draw";
import { solveExpression } from "@/draw";

const api = axiosWithAuth()

enum shape {
     select="Select",
     rect ="Rect",
     pencil="Pencil",
     Oval="Oval",
     Triangle="Triangle",
     Eraser="Eraser",
     Text="Text",
     Arrow="Arrow",
     Line="Line",
     Hand = "Hand"

}
const basicColors = [
     "#ffffff",
     "#ff4d4d",
     "#4dff4d",
     "#4d9fff",
     "#ffeb3b",
     "#ff66ff",
    
   ];
   // zoom,offset x/y,existingshape,setexistingshape,selectedshapeIds
export  function Canvas({roomId,socket}:{roomId:string,socket:WebSocket}){
    const CanvasRef = useRef<HTMLCanvasElement >(null);
    const [selectedTool,setSelectedTool] = useState<shape>(shape.rect);
    const toolRef= useRef<shape>(selectedTool);
    const [thickness,setThickness] = useState(2);
    const thicknessRef = useRef(2);
    const [color,setColor]=useState("#ffffff");
    const colorRef =useRef("#ffffff")
    const router =useRouter()
    const [isMobile,setIsMobile]=useState(false)
    const [check,setCheck]=useState(true)
    const [dimensions, setDimensions] = useState({ 
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0 
    
  });
   const [zoom, setZoom] = useState(1);
   const zoomRef = useRef(1);
   const [offsetX, setOffsetX] = useState(0);
   const [offsetY, setOffsetY] = useState(0);
   const [existingShapes, setExistingShapes] = useState<Shape[]>([]);
   const [selectedShapeIds, setSelectedShapeIds] = useState<Set<string>>(new Set());
   const [loadImprove,setLoadImprove] = useState(false);
   const [loadSolving,setLoadSolving]=useState(false);
   const [airesponse,setAiresponse]=useState<string | null >(null);


  const updateExistingShapes = useCallback((newShapes: React.SetStateAction<Shape[]>) => {
      setExistingShapes(newShapes);
    }, []);

  const updateSelectedShapeIds = useCallback((newSelectedIds: React.SetStateAction<Set<string>>) => {
      setSelectedShapeIds(newSelectedIds);
    }, []);
   const updateZoom = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);
// for zoom on wheel 
    const updatezoomandoffset =useCallback((newzoom:number,offsetx:number,offsety:number)=>{
         setZoom(newzoom);
         setOffsetX(offsetx);
         setOffsetY(offsetY);
    },[])

    // Handle window resize and set canvas dimensions.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const updateDimensions = () => {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
        setIsMobile(window.innerWidth < 768);
      };
      updateDimensions();
      window.addEventListener("resize", updateDimensions);
      return () => window.removeEventListener("resize", updateDimensions);
    }
  }, []);

    useEffect(()=>{
         thicknessRef.current=thickness
    },[thickness])

    useEffect(()=>{
        toolRef.current=selectedTool
    },[selectedTool])

    useEffect(()=>{
       colorRef.current = color; 
    },[color])

    useEffect(()=>{
        zoomRef.current=zoom
    },[zoom])

    useEffect(()=>{
       if(CanvasRef.current){
         initDraw(
          CanvasRef.current,
          roomId,
          ()=>toolRef.current,
          ()=>thicknessRef.current,
          ()=>colorRef.current,
          socket,
          ()=>zoomRef.current,
          updateZoom,
          updateOffsetX,
          updateOffsetY,
          existingShapes,
          updateExistingShapes,
          offsetX,
          offsetY,
          selectedShapeIds,
          updateSelectedShapeIds
        )
       }

    },[CanvasRef,roomId,socket,check])

    // Create stable setter functions
    const updateOffsetX = useCallback((newOffsetX: number) => {
     setOffsetX(newOffsetX);
    }, []);

    const updateOffsetY = useCallback((newOffsetY: number) => {
     setOffsetY(newOffsetY);
    }, []);

    const handleZoomIn =()=>{
      const newZoom=Math.min(zoom*1.2,5);
      setZoom(newZoom)
    }
    const handleZoomOut=()=>{
      const newZoom=Math.max(zoom/1.2,0.1)
      setZoom(newZoom);
    }
    const resetZoom=()=>{
      setZoom(1)
    }
    async function delchats(){
      try{
        const res = await api.delete(`${http_backend}/delchats/${roomId}`)
        setCheck(prev=>!prev)
        if(res.data.message){
          toast.success(res.data.message)
        }
      }catch(e){
         toast.error("failed to del chats")
      }

    }
   async function handleImprove() {
    try {
      setLoadImprove(true);
      await generateImageFromSelection(
        existingShapes,
        selectedShapeIds,
        roomId,
        socket
      );
    } catch (error) {
      console.error("Improvement failed:", error);
      toast.error("Failed to improve image");
    } finally {
      setLoadImprove(false); // Runs whether success or failure
    }
  }
  async function handleSolve(){
    try{console.log(airesponse);
      setLoadSolving(true)
    await solveExpression(
      existingShapes,
      selectedShapeIds,
      roomId,
      socket,
      setAiresponse
    );
  }catch(e){
    console.log("error solving ",e)
    toast.error("failed to Solve ")
  }finally{
   setLoadSolving(false);
  }
  }
   const formatAIResponse = (response: string) => {
    try {
      const parsed = JSON.parse(response);
      return Object.entries(parsed)
        .map(([key, value]) => {
          // If the value is an object, stringify it with indentation.
          const formattedValue =
            typeof value === "object" && value !== null
              ? JSON.stringify(value, null, 2)
              : value;
          return `${key}: ${formattedValue}`;
        })
        .join("\n");
    } catch (error: any) {
      return response;
    }
  };
    return (
        <div className=" relative w-screen h-screen bg-black  overflow-hidden">
             {airesponse && (
                  <div className="fixed right-0 bottom-0 z-50 bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full m-4">
                    {/* Cross Button to Dismiss */}
                    <button
                       onClick={() => setAiresponse(null)}
                       className="absolute top-2 right-2 text-gray-300 hover:text-white"
                    >
                      <X size={24} />
                    </button>
                    <pre className="text-white whitespace-pre-wrap">
                      {formatAIResponse(airesponse)}
                    </pre>
                  </div>
             )}
            {/* settings Box at left */}
            <div className="absolute z-10 left-4 top-24 space-y-6 p-6  bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl ">
                <div className="space-y-4  ">
                     <p className="font-semibold text-2xl text-center text-white mb-6 ">Stroke Setting</p>
                    <div className="space-y-2">
                      <label htmlFor="thickness" className="block font-medium text-sm text-slate-300">Stroke size : {thickness}px </label>
                      <input 
                        id="thickness"
                        type="range"
                        min="1"
                        max={selectedTool=="Arrow"?"6":"20"}
                        onChange={(e)=>setThickness(Number(e.target.value))}
                        defaultValue={2}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                </div>
               { selectedTool !== shape.Eraser && 
               <div className="space-y-2">
                    <div><p className="text-sm font-medium text-slate-300 ">Custom color:</p></div>
                    <input 
                       id="color"
                       type="color"
                       value={color}
                       onChange={e=>setColor(e.target.value)}
                       className="w-full h-10  cursor-pointer  border border-slate-700/50  bg-slate-700/95 rounded-lg"
                    />
                     <div >
                        <p className="text-slate-300 font-medium  text-sm mb-2">Quick Colors:</p>
                        <div className="grid grid-cols-4 gap-2">
                            {basicColors.map((c)=>(
                            <button 
                               key={c}
                               onClick={()=>setColor(c)}
                               style={{background:c}}
                               className={`w-10 h-10 rounded-lg border border-gray-600 hover:scale-105 active:scale-95
                                         ${color.toLowerCase()===c.toLowerCase()?  "ring-2 ring-indigo-600":""  } `}
                               />
                           ))}
                        </div>

                    </div>
                </div>}

            </div>
            {/* Logout */}
            <div className="absolute z-10 top-20 right-4 flex gap-2 md:top-4">
                <button className="bg-slate-800/95 text-white p-1 rounded font-semibold text-sm hover:cursor-pointer hover:bg-slate-700/50"
                    disabled={loadImprove}  onClick={handleImprove}
                   >
                  {loadImprove?"Improving...":"Improve"}
                </button>
                <button className="bg-slate-800/95 text-white p-1 rounded font-semibold text-sm hover:cursor-pointer hover:bg-slate-700/50"
                    disabled={loadSolving}  onClick={handleSolve}
                   >
                  {loadSolving?"Solving...":"Solve"}
                </button>
                <button className="bg-slate-800/95 text-white p-1 rounded font-semibold text-sm hover:cursor-pointer hover:bg-slate-700/50"
                  onClick={delchats}
                 >
                  clear
                </button>
                <button className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 active:scale-95 hover:scale-105 "
                onClick={()=>{router.push("/dashboard")}}>
                    Logout
                </button>

            </div>
            {/* topbar */}
            <div className={`absolute z-10 ${
              isMobile ? 'top-4 left-1/2 transform -translate-x-1/2' : 'top-6 left-1/2 transform -translate-x-1/2'
            } bg-slate-800/95  border border-slate-700/50 px-4 py-2 rounded-2xl backdrop-blur-sm shadow-2xl`}>
                <Topbar selectedTool={selectedTool} setSelectedTool={setSelectedTool} isMobile={isMobile} />
            </div>
            {/* Main canvas is here */}
           <div>
            <canvas ref={CanvasRef} width={dimensions.width} height={dimensions.height} className=" z-0 absolute top-0 left-0 bg-black "></canvas>
           </div>
           {/* zoom buttons */}
           <div className={`  md:absolute left-8 bottom-5 z-10 bg-slate-800/95 rounded-2xl shadow-2xl border border-slate-700/50 p-4 `}>
               <div className="flex items-center gap-3">
                 <button className="bg-slate-700/50 text-white rounded-lg shadow-2xl p-2 border border-slate-600/50 hover:bg-slate-700/50 hover:cursor-pointer hover:scale-105 active:scale-95"
                   onClick={handleZoomOut}
                   >
                    <ZoomOut className="w-4 h-4"/>
                 </button>
                 <button className="bg-slate-700/50 min-w-[60px] text-white rounded-lg shadow-2xl py-1 px-3 border border-slate-600/50 hover:bg-slate-700/50 hover:cursor-pointer hover:scale-105 active:scale-95"
                   onClick={resetZoom}
                   >
                    {Math.round(zoom * 100)}%
                 </button>
                 <button className="bg-slate-700/50  text-white rounded-lg shadow-2xl p-2 border border-slate-600/50 hover:bg-slate-700/50 hover:cursor-pointer hover:scale-105 active:scale-95"
                  onClick={handleZoomIn}
                  >
                   <ZoomIn className="w-4 h-4"/>
                 </button>

               </div>
           

           </div>
        </div>
          
    )
    

}
function Topbar({selectedTool,setSelectedTool,isMobile}:{
    selectedTool:shape, setSelectedTool:(s:shape)=>void,isMobile:boolean
}){
    return (
        <div>
            <div className={`flex items-center ${isMobile?"gap-1":"gap-2"} `}>
                <IconButton Activated={selectedTool===shape.Hand} size={isMobile?"sm":"md"} Icon={<Hand/>} // Using AlignCenter as hand icon
                   onclick={()=>setSelectedTool(shape.Hand)} />
                <IconButton Activated={selectedTool===shape.select} Icon={<MousePointer />} size={isMobile?"sm":"md"}
                    onclick={()=>{
                    setSelectedTool(shape.select)
                    }}/>
                <IconButton Icon={<RectangleHorizontalIcon/>} size={isMobile?"sm":"md"} Activated={selectedTool===shape.rect} onclick={()=>setSelectedTool(shape.rect)}></IconButton>
                
                 <IconButton Activated={selectedTool===shape.Oval} Icon={<Circle />} size={isMobile?"sm":"md"}
                    onclick={()=>{
                    setSelectedTool(shape.Oval)
                    }}/>

                  <IconButton Activated={selectedTool===shape.Text} Icon={<Type/>} size={isMobile?"sm":"md"}
                     onclick={()=>{
                    setSelectedTool(shape.Text)
                    }}/> 

                  <IconButton Activated={selectedTool===shape.Triangle} Icon={<Triangle/>} size={isMobile?"sm":"md"}
                     onclick={()=>{
                    setSelectedTool(shape.Triangle)
                    }}/>
                  <IconButton 
                       Activated={selectedTool===shape.pencil} size={isMobile?"sm":"md"}
                       Icon={<Pencil />} 
                       onclick={()=>{
                            setSelectedTool(shape.pencil)
                         }}/>
                  <IconButton Activated={selectedTool===shape.Eraser} Icon={<Eraser/>} size={isMobile?"sm":"md"}
                     onclick={()=>{
                    setSelectedTool(shape.Eraser)
                    }}/>
                  <IconButton Activated={selectedTool===shape.Arrow} Icon={<MoveRight/>}  size={isMobile?"sm":"md"}
                     onclick={()=>setSelectedTool(shape.Arrow)}/>
                  <IconButton  Activated={selectedTool===shape.Line} Icon={<Minus/>} size={isMobile?"sm":"md"}
                    onclick={()=> setSelectedTool(shape.Line)} />
                  
            </div>
        </div>
    )


}