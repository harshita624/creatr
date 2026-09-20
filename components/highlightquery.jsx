import React,{useState,useRef,useEffect} from "react"

function Match()
{
    const [query,setQuery]=useState("")
    const [loading,setLoading]=useState(false)
    const [results,setResults]=useState([])
    const cache=useRef(null)
    function highlight(text)
    {
        if(!query)
        {
            return null
        }
        const parts=text.split(new RegExp(`({query})`,"gi"))
        return parts.map((part,index)=>{
            if(part.toLowerCase()===query.toLowerCase())
            {
                return <mark key={index} >{part}</mark>
            }
            return part
        })


    }
    useEffect(()=>{
        if(query=="")
        {
            setResults([])
            return
        }
        if(cache.current[query])
        {
            setResults(cache.current[query])
            return 
        }
        const controller=new AbortController()
        const timer=setTimeout(async()=>{
            try{
                setLoading(true)
                const res=await fetch(`cbdscjc&{query}`,{
                    signal:controller.signal
                })
                data=res.json()
                cache.current[query]=data.products 
                setResults(data.products)
            }
            catch(err)
            {
                console.log(err)
                setLoading(false)
            }
        },300)
        return()=>{
            setTimeout(timer)
            controller.abort()
        }
    },[query])

    return(
        <div>
            <input value={query} onChange={(e)=>setQuery(e.target.value)} />
            {results.map(product=>(
                <div key={product.id} >
                    <p>{highlight(product.title)}</p>
                    
                </div>
            ))}
        </div>
    )
}