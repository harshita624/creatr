import React,{useState,useEffect,useRef,useCallback} from "react"

function Infinite()
{
    const [page,setPage]=useState(1)
    const [hasMore,setHasMore]=useState(true)
    const [loading,setLoading]=useState(false)
    const [error,setError]=useState("")
    const [products,setProducts]=useState([])
    const observer=useRef(null)

    useEffect(()=>{
        const controller=new AbortController()
        async function fetchPage(pageNo)
        {
            setLoading(true)
            try{
               const res=await fetch(`cbdsjb${pageNo-1}*10`,{
                signal:controller.signal
               })
               const data=await res.json()
               if(pageNo*10>=data.total)
               {
                setHasMore(false)
               }
               setProducts(prev=>[...prev,...data.products])
            }catch(err)
            {
                setError(err)

            }finally{
                setLoading(false)
            }
             
        }
      
        fetchPage(page)
          return()=>{
            controller.abort()
        }
    },[page])
    const lastRef=useCallback((node)=>{
           if(loading)return 

           if(observer.current)
           {
            observer.current.disconnect()
           }
           observer.current=new IntersectionObserver(entries=>{
            if(entries[0].isIntersecting && hasMore)
            {
                setPage(prev=>prev+1)
            }
           })
           if(node)
           {
            observer.current.observe(node)
           }
    },[loading,hasMore])
    return(
        <div>
            {products.map((item,index)=>{
                const last=index===products.length-1
                return(
                <div  key={item.id} ref={last?lastRef:null}>
                    <p>{item.title}</p>
                    <p>{item.content}</p>
                </div>
                )
})}
{loading && <p>Loading...</p>}
{error && <p>{error}</p>}
        </div>
    )
}